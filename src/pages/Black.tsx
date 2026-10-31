import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgePercent, CalendarCheck, Check, Flame, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

const PRICE = BLACK_OFFER.amountCents / 100;
const ANCHOR = BLACK_OFFER.anchorCents / 100;
const MONTHLY_FULL = PRICE_TABLE.full.monthlyCents / 100;
const DISCOUNT_PCT = Math.round((1 - PRICE / ANCHOR) * 100);
const PER_DAY = PRICE / 365;
const PER_MONTH = PRICE / 12;
const SAVINGS = ANCHOR - PRICE;

const CTA_LABEL = "Assinar plano Black anual";
const GOLD_BUTTON =
  "bg-offer-gold text-offer-gold-foreground hover:bg-offer-gold/90 font-semibold shadow-[0_10px_30px_-10px_hsl(var(--offer-gold)/0.7)]";

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
    q: "Já tenho conta na MedStation. Posso aproveitar?",
    a: "Pode. Use o mesmo e-mail da sua conta: os 12 meses entram assim que o pagamento for confirmado.",
  },
  {
    q: "Posso usar cupom junto?",
    a: "A Black já é o menor preço do ano para a MedStation, por isso cupons e descontos de indicação não se somam a ela.",
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

const MARQUEE_ITEMS = [
  "Black MedStation",
  `${DISCOUNT_PCT}% off no anual`,
  `de ${brl(ANCHOR)} por ${brl(PRICE)}`,
  "Só em novembro",
  `${brl(PER_DAY)} por dia`,
  "7 dias de garantia",
];

function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Fades a block in the first time it scrolls into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        visible ? "opacity-100 translate-y-0" : "motion-safe:opacity-0 motion-safe:translate-y-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Marquee({ className }: { className?: string }) {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className={cn("overflow-hidden bg-offer-gold text-offer-gold-foreground", className)} aria-hidden="true">
      <div className="flex w-max motion-safe:animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-4 px-4 py-2 font-mono text-[0.7rem] md:text-xs font-semibold uppercase tracking-[0.2em] whitespace-nowrap"
              >
                {item}
                <span className="h-1.5 w-1.5 rotate-45 bg-offer-gold-foreground/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
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
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-mono text-offer-hot">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-offer-hot opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-offer-hot" />
        </span>
        {label}
      </p>
      <div className="mt-2 flex gap-2" role="timer" aria-live="off">
        {parts.map((p, i) => (
          <div
            key={p.l}
            className={cn(
              "min-w-[3.8rem] rounded-lg border px-2 py-2 text-center",
              i === parts.length - 1
                ? "border-offer-hot/50 bg-offer-hot/10"
                : "border-offer-border bg-offer-foreground/5",
            )}
          >
            <div
              key={i === parts.length - 1 ? p.v : undefined}
              className={cn(
                "text-xl md:text-3xl font-semibold tabular-nums",
                i === parts.length - 1 && "text-offer-hot motion-safe:animate-fade-in",
              )}
            >
              {String(p.v).padStart(2, "0")}
            </div>
            <div className="text-[0.65rem] text-offer-muted">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function scrollToCheckout(cta: string) {
  trackCtaClick({ cta, section: "black", destination: "#assinar" });
  document.getElementById("assinar")?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => document.getElementById("black-email")?.focus({ preventScroll: true }), 600);
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
    <form
      id="assinar"
      onSubmit={submit}
      className="relative overflow-hidden rounded-2xl border-2 border-offer-gold bg-card text-card-foreground p-5 md:p-7 shadow-[0_30px_80px_-30px_hsl(var(--offer-gold)/0.55)] scroll-mt-24"
    >
      {/* Tarja diagonal */}
      <div className="pointer-events-none absolute -right-12 top-5 rotate-45 bg-offer-hot px-12 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-offer-foreground shadow-md">
        {DISCOUNT_PCT}% off
      </div>

      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-offer-hot" />
        <span className="text-sm font-semibold">Plano Black anual</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        de <span className="line-through decoration-offer-hot decoration-2">{brl(ANCHOR)}</span> por
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-5xl md:text-6xl font-bold tracking-tight">{brl(PRICE)}</span>
        <span className="text-sm text-muted-foreground">/ano</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-offer-gold/20 px-2.5 py-1 font-semibold text-foreground">
          Você economiza {brl(SAVINGS)}
        </span>
        <span className="text-muted-foreground">Pagamento único · {brl(PER_MONTH)}/mês</span>
      </div>

      <div className="mt-6 space-y-3">
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
              className="mt-1.5 h-12"
              required
            />
            <p className="mt-1 text-[0.7rem] text-muted-foreground">Se já tem conta na MedStation, use o mesmo e-mail.</p>
          </div>
        )}
        <Button
          type="submit"
          className={cn(
            "relative w-full h-14 text-base md:text-lg overflow-hidden",
            GOLD_BUTTON,
            status === "active" && !loading && "motion-safe:animate-cta-pulse",
          )}
          disabled={status !== "active" || loading}
        >
          {status === "active" && !loading && (
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-offer-foreground/40 to-transparent motion-safe:animate-brand-sweep" />
          )}
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abrindo pagamento...
            </>
          ) : status === "upcoming" ? (
            "Disponível a partir de 1º de novembro"
          ) : (
            <>
              {CTA_LABEL} <ArrowRight className="w-5 h-5 ml-1.5" />
            </>
          )}
        </Button>
      </div>

      <ul className="mt-5 grid gap-1.5 text-xs text-muted-foreground">
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

function GoldCta({ cta, className }: { cta: string; className?: string }) {
  return (
    <Button
      size="lg"
      onClick={() => scrollToCheckout(cta)}
      className={cn("h-14 px-7 text-base motion-safe:animate-cta-pulse", GOLD_BUTTON, className)}
    >
      {CTA_LABEL} <ArrowRight className="w-5 h-5 ml-1.5" />
    </Button>
  );
}

const highlights = [
  {
    icon: Lock,
    title: "Preço travado por 12 meses",
    text: `Em dezembro a MedStation sobe para ${brl(ANCHOR)} por ano. Você segue o ano inteiro sem nenhum reajuste.`,
  },
  {
    icon: ShieldCheck,
    title: "7 dias de garantia incondicional",
    text: "Use à vontade na sua rotina. Se não fizer sentido para você nos primeiros 7 dias, devolvemos 100% do valor.",
  },
  {
    icon: CalendarCheck,
    title: "Paga uma vez, sem surpresa",
    text: "Pagamento único no cartão ou boleto. Nada de cobrança automática no fim dos 12 meses.",
  },
];

export default function Black() {
  const now = useClock();
  const status = blackStatus(now);
  const [params] = useSearchParams();
  const canceled = params.get("canceled") === "true";
  const active = status === "active";

  return (
    <div className={cn("min-h-screen bg-background text-foreground", active && "pb-20 md:pb-0")}>
      <Seo
        path="/black"
        title="Black MedStation — um ano inteiro por R$ 399,90"
        description="Só em novembro: o plano anual completo da MedStation de R$ 999,90 por R$ 399,90, em pagamento único no cartão ou boleto. 7 dias de garantia."
      />

      <Marquee />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" aria-label="MedStation">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/auth" onClick={() => trackCtaClick({ cta: "black_login", section: "black", destination: "/auth" })}>
                Já sou cliente
              </Link>
            </Button>
            {active && (
              <Button size="sm" className={cn("hidden sm:inline-flex", GOLD_BUTTON)} onClick={() => scrollToCheckout("black_header")}>
                Assinar Black
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-offer text-offer-foreground">
        {/* Brilhos de fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 motion-safe:animate-orb-float"
          style={{
            background:
              "radial-gradient(700px 380px at 85% 20%, hsl(var(--offer-gold) / 0.18), transparent 60%), radial-gradient(800px 420px at 5% 0%, hsl(var(--offer-accent) / 0.16), transparent 60%)",
          }}
        />
        <div className="relative container mx-auto px-4 md:px-8 pt-10 pb-16 md:pt-16 md:pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          <div className="motion-safe:animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-sm bg-offer-hot px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-offer-foreground">
              <Sparkles className="w-3.5 h-3.5" /> Black MedStation · só em novembro
            </span>
            <h1 className="mt-5 text-[2.4rem] leading-[1.03] md:text-7xl font-semibold tracking-tight">
              Um ano inteiro de MedStation por{" "}
              <span className="relative inline-block text-offer-gold">
                {brl(PRICE)}
                <span className="absolute -bottom-1 left-0 h-1.5 w-full rounded-full bg-offer-gold/40" />
              </span>
              .
            </h1>
            <p className="mt-6 text-base md:text-lg text-offer-muted leading-relaxed max-w-xl">
              O plano anual completo com <span className="text-offer-foreground font-semibold">{DISCOUNT_PCT}% de desconto</span>: de{" "}
              <span className="line-through decoration-offer-hot decoration-2">{brl(ANCHOR)}</span> por {brl(PRICE)}, em pagamento
              único. Dá cerca de <span className="text-offer-gold font-semibold">{brl(PER_DAY)} por dia</span> para escrever menos
              burocracia e atender mais.
            </p>

            <div className="mt-8">
              {active && <Countdown target={BLACK_OFFER.endsAt} now={now} label="A oferta termina em" />}
              {status === "upcoming" && <Countdown target={BLACK_OFFER.startsAt} now={now} label="A Black começa em" />}
              {status === "ended" && (
                <p className="text-sm text-offer-muted">A oferta foi válida de 1 a 30 de novembro de 2026.</p>
              )}
            </div>
          </div>

          <div className="text-left motion-safe:animate-slide-up">
            {canceled && active && (
              <p className="mb-3 rounded-lg border border-offer-gold/40 bg-offer-gold/10 px-3 py-2 text-xs text-offer-foreground">
                O pagamento não foi concluído. Sua oferta continua aqui até 30/11.
              </p>
            )}
            <CheckoutCard status={status} />
          </div>
        </div>
      </section>

      {/* Tarja diagonal entre seções */}
      <div className="relative -mt-4 overflow-hidden py-4" aria-hidden="true">
        <Marquee className="-rotate-1 scale-[1.02] bg-offer-hot text-offer-foreground [&_span>span]:bg-offer-foreground/70" />
      </div>

      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20 space-y-16 md:space-y-20">
        <section className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Tudo o que entra no seu ano</h2>
            <p className="mt-3 text-muted-foreground">A MedStation completa, com todos os assistentes e sem limite de uso.</p>
            <ul className="mt-6 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <BadgePercent className="w-4 h-4 text-offer-hot" /> Compare e decida
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg px-3 py-3">
                  <dt className="text-muted-foreground">Mensal, a partir de 1º/12</dt>
                  <dd className="text-muted-foreground">
                    <span className="line-through">{brl(MONTHLY_FULL * 12)}</span>/ano
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg px-3 py-3">
                  <dt className="text-muted-foreground">Anual, a partir de 1º/12</dt>
                  <dd className="text-muted-foreground">
                    <span className="line-through">{brl(ANCHOR)}</span>/ano
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-offer-gold bg-offer-gold/10 px-3 py-3">
                  <dt className="font-semibold">Black MedStation</dt>
                  <dd className="text-lg font-bold">{brl(PRICE)}/ano</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm">
                São <span className="font-semibold">{brl(SAVINGS)} a mais no seu bolso</span> em relação ao anual de dezembro.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="grid md:grid-cols-3 gap-4 md:gap-6">
          {highlights.map((h, i) => (
            <Reveal key={h.title} delay={i * 120}>
              <div className="group h-full rounded-2xl border border-border bg-card p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-offer-gold/60 hover:shadow-[0_20px_40px_-20px_hsl(var(--offer-gold)/0.5)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-offer-gold/15">
                  <h.icon className="w-5 h-5 text-foreground" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{h.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{h.text}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal>
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
        </Reveal>
      </main>

      {active && (
        <section className="relative overflow-hidden bg-offer text-offer-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(600px 300px at 50% 120%, hsl(var(--offer-gold) / 0.25), transparent 70%)" }}
          />
          <Reveal className="relative container mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-offer-gold">Última chance do ano</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
              {brl(PRICE)} por 12 meses. <span className="text-offer-gold">Só até 30/11.</span>
            </h2>
            <div className="mt-8 flex justify-center">
              <Countdown target={BLACK_OFFER.endsAt} now={now} label="Termina em" />
            </div>
            <GoldCta cta="black_footer" className="mt-8" />
            <p className="mt-3 text-xs text-offer-muted">7 dias de garantia · Cartão ou boleto · Sem renovação automática</p>
          </Reveal>
        </section>
      )}

      {/* Barra fixa no celular */}
      {active && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-offer-border bg-offer/95 px-4 py-3 text-offer-foreground backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 leading-tight">
              <p className="text-[0.65rem] text-offer-muted line-through">{brl(ANCHOR)}</p>
              <p className="text-base font-bold text-offer-gold">{brl(PRICE)}<span className="text-xs font-normal text-offer-muted">/ano</span></p>
            </div>
            <Button className={cn("h-12 flex-1 text-sm motion-safe:animate-cta-pulse", GOLD_BUTTON)} onClick={() => scrollToCheckout("black_sticky_mobile")}>
              {CTA_LABEL}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
