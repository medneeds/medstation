import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackCheckoutStarted, trackCtaClick } from "@/lib/analytics";
import { BLACK_OFFER, PRICE_TABLE, blackStatus, timeLeft, type BlackStatus } from "@/lib/pricingSchedule";
import { brl } from "@/lib/subscription-tiers";

const PRICE = BLACK_OFFER.amountCents / 100;
const ANCHOR = BLACK_OFFER.anchorCents / 100;
const MONTHLY_FULL = PRICE_TABLE.full.monthlyCents / 100;
const DISCOUNT_PCT = Math.round((1 - PRICE / ANCHOR) * 100);
const PER_DAY = PRICE / 365;
const PER_MONTH = PRICE / 12;

const included = [
  "12 assistentes clínicos: anamnese, evolução, prescrição, exames, atestados e mais",
  "Modo Escuta: a consulta vira anamnese enquanto você atende",
  "Modo Rotineiro e Modo Operador para as tarefas repetitivas do plantão",
  "Cofre Inteligente para guardar notas, casos e arquivos importantes",
  "Todas as novidades lançadas durante os seus 12 meses",
];

const faq = [
  {
    q: "A Black renova sozinha?",
    a: `Não. É um pagamento único de ${brl(PRICE)} que libera 12 meses de acesso, sem cobrança automática no fim.`,
  },
  {
    q: "Posso pagar no boleto?",
    a: "Sim. O boleto vence em 3 dias e o acesso é liberado assim que o banco confirmar o pagamento. Gere o seu boleto até 30 de novembro.",
  },
  {
    q: "Estou no teste grátis. Posso aproveitar?",
    a: "Pode. Use o mesmo e-mail da sua conta: os 12 meses entram assim que o pagamento for confirmado.",
  },
  {
    q: "O bônus Arsenal Med vem junto?",
    a: "Não. O Arsenal Med continua exclusivo do plano anual regular. A Black é o preço mais baixo do ano para a MedStation, sem bônus. Cupons e descontos de indicação também não se somam à oferta.",
  },
  {
    q: "Já sou assinante mensal. Como faço?",
    a: "A Black é para novas assinaturas anuais. Se você já assina o mensal e quer migrar, fale com a gente pelo suporte dentro da plataforma.",
  },
  {
    q: "E depois de novembro?",
    a: `A partir de 1º de dezembro, a MedStation passa a custar ${brl(MONTHLY_FULL)} por mês ou ${brl(ANCHOR)} por ano.`,
  },
];

function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Countdown({ target, now, label }: { target: string; now: number; label: string }) {
  const t = timeLeft(target, now);
  const parts = [
    { v: t.days, l: "dias" },
    { v: t.hours, l: "horas" },
    { v: t.minutes, l: "min" },
    { v: t.seconds, l: "seg" },
  ];
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] font-mono text-offer-muted">{label}</p>
      <div className="mt-2 flex gap-2" role="timer" aria-live="off">
        {parts.map((p) => (
          <div key={p.l} className="min-w-[3.6rem] rounded-lg border border-offer-border bg-offer-foreground/5 px-2 py-2 text-center">
            <div className="text-xl md:text-2xl font-semibold tabular-nums">{String(p.v).padStart(2, "0")}</div>
            <div className="text-[0.65rem] text-offer-muted">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutCard({ status }: { status: BlackStatus }) {
  const [email, setEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user?.email ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "active") return;
    const clean = (sessionEmail ?? email).trim();
    if (!sessionEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Confira o e-mail e tente de novo." });
      return;
    }
    setLoading(true);
    trackCheckoutStarted({
      origin: "black_2026",
      product: "pro_completo",
      plan: BLACK_OFFER.slug,
      billing_period: "yearly",
      price_brl: PRICE,
      auth_state: sessionEmail ? "authenticated" : "guest",
    });
    try {
      const { data, error } = sessionEmail
        ? await supabase.functions.invoke("create-checkout", {
          body: { plan: BLACK_OFFER.slug, billingPeriod: "yearly" },
        })
        : await supabase.functions.invoke("guest-checkout", {
          body: { email: clean, product: "pro_completo", billingPeriod: "yearly", plan: BLACK_OFFER.slug },
        });
      if (error) {
        let message = error.message;
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) message = body.error;
        } catch {
          // mantém a mensagem original
        }
        throw new Error(message);
      }
      if (!data?.url) throw new Error("Não foi possível abrir o pagamento.");
      window.location.href = data.url;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Não deu certo",
        description: (err as Error)?.message || "Tente novamente em instantes.",
      });
      setLoading(false);
    }
  };

  if (status === "ended") {
    return (
      <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-medical">
        <p className="text-lg font-semibold">A Black MedStation terminou</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Obrigado a todos que garantiram o ano. Os planos atuais estão na página inicial.
        </p>
        <Button asChild className="mt-5 w-full h-11">
          <Link to="/">Ver planos atuais</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card text-card-foreground p-5 md:p-6 shadow-medical">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Plano anual · Black</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
          {DISCOUNT_PCT}% off
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        de <span className="line-through">{brl(ANCHOR)}</span> por
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tracking-tight text-primary">{brl(PRICE)}</span>
        <span className="text-sm text-muted-foreground">/ano</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pagamento único · equivale a {brl(PER_MONTH)} por mês
      </p>

      <div className="mt-5 space-y-3">
        {sessionEmail ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Você vai assinar com a conta <span className="font-medium text-foreground">{sessionEmail}</span>.
          </p>
        ) : (
          <div>
            <label htmlFor="black-email" className="text-xs font-medium">
              Seu melhor e-mail
            </label>
            <Input
              id="black-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status !== "active" || loading}
              className="mt-1.5 h-11"
              required
            />
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              Se já tem conta ou está no teste grátis, use o mesmo e-mail.
            </p>
          </div>
        )}
        <Button type="submit" className="w-full h-12 text-base" disabled={status !== "active" || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abrindo pagamento...
            </>
          ) : status === "upcoming" ? (
            "Disponível a partir de 1º de novembro"
          ) : (
            <>
              Garantir meu ano por {brl(PRICE)} <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-primary" /> Cartão ou boleto, em ambiente seguro
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> 7 dias de garantia incondicional
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-primary" /> 12 meses de acesso, sem renovação automática
        </li>
      </ul>
    </form>
  );
}

export default function Black() {
  const now = useClock();
  const status = blackStatus(now);
  const [params] = useSearchParams();
  const canceled = params.get("canceled") === "true";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        path="/black"
        title="Black MedStation — um ano inteiro por R$ 399,90"
        description="Só em novembro: o plano anual completo da MedStation de R$ 999,90 por R$ 399,90, em pagamento único no cartão ou boleto. 7 dias de garantia."
      />

      <section className="bg-offer text-offer-foreground">
        <header className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" aria-label="MedStation" className="rounded-sm bg-offer-foreground px-2 py-1">
            <Logo size="sm" />
          </Link>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-offer-foreground hover:bg-offer-foreground/10 hover:text-offer-foreground"
          >
            <Link to="/auth" onClick={() => trackCtaClick({ cta: "black_login", section: "black", destination: "/auth" })}>
              Já sou cliente
            </Link>
          </Button>
        </header>

        <div className="container mx-auto px-4 md:px-8 pt-8 pb-14 md:pt-14 md:pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          <div>
            <span className="inline-flex items-center rounded-sm border border-offer-border px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-offer-accent">
              Black MedStation · só em novembro
            </span>
            <h1 className="mt-5 text-[2.2rem] leading-[1.05] md:text-6xl font-semibold tracking-tight">
              Um ano inteiro de MedStation por <span className="text-offer-accent">{brl(PRICE)}</span>.
            </h1>
            <p className="mt-5 text-base md:text-lg text-offer-muted leading-relaxed max-w-xl">
              O plano anual completo com {DISCOUNT_PCT}% de desconto: de {brl(ANCHOR)} por {brl(PRICE)}, em pagamento
              único. Dá cerca de <span className="text-offer-foreground font-medium">{brl(PER_DAY)} por dia</span> para
              escrever menos burocracia e atender mais.
            </p>

            <div className="mt-8">
              {status === "active" && <Countdown target={BLACK_OFFER.endsAt} now={now} label="A oferta termina em" />}
              {status === "upcoming" && <Countdown target={BLACK_OFFER.startsAt} now={now} label="A Black começa em" />}
              {status === "ended" && (
                <p className="text-sm text-offer-muted">A oferta foi válida de 1 a 30 de novembro de 2026.</p>
              )}
            </div>
          </div>

          <div className="text-left">
            {canceled && status === "active" && (
              <p className="mb-3 rounded-lg border border-offer-border px-3 py-2 text-xs text-offer-muted">
                O pagamento não foi concluído. Sua oferta continua aqui até 30/11.
              </p>
            )}
            <CheckoutCard status={status} />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 md:px-8 py-14 md:py-20 space-y-16">
        <section className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Tudo o que entra no seu ano</h2>
            <p className="mt-3 text-muted-foreground">
              A mesma MedStation completa do plano anual, sem limite de uso dos assistentes.
            </p>
            <ul className="mt-6 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h3 className="text-base font-semibold">Quanto custa depois de novembro</h3>
            <dl className="mt-4 divide-y divide-border text-sm">
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted-foreground">Mensal, a partir de 1º/12</dt>
                <dd>
                  {brl(MONTHLY_FULL)}/mês <span className="text-muted-foreground">({brl(MONTHLY_FULL * 12)} no ano)</span>
                </dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-muted-foreground">Anual, a partir de 1º/12</dt>
                <dd>{brl(ANCHOR)}/ano</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="font-semibold">Black MedStation</dt>
                <dd className="font-semibold text-primary">{brl(PRICE)}/ano</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              Você economiza {brl(ANCHOR - PRICE)} em relação ao anual de dezembro.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h3 className="mt-3 text-base font-semibold">7 dias de garantia incondicional</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use à vontade na sua rotina. Se não fizer sentido para você nos primeiros 7 dias, devolvemos 100% do valor.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <X className="w-6 h-6 text-muted-foreground" />
            <h3 className="mt-3 text-base font-semibold">O que esta oferta não inclui</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O bônus Arsenal Med, que segue exclusivo do plano anual regular. Cupons e descontos de indicação também
              não se somam à Black.
            </p>
          </div>
        </section>

        <section className="max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-center">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-4">
            {faq.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {status === "active" && (
          <section className="text-center">
            <Button
              size="lg"
              className="h-12 px-6 text-base"
              onClick={() => {
                trackCtaClick({ cta: "black_footer", section: "black", destination: "#top" });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Garantir meu ano por {brl(PRICE)} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Válido até 30 de novembro, 23h59 (horário de Brasília).</p>
          </section>
        )}
      </main>
    </div>
  );
}
