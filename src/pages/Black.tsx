import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgePercent, CalendarCheck, Check, Flame, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { campaignUtm, trackCheckoutStarted, trackCtaClick } from "@/lib/analytics";
import { hasMarketingConsent } from "@/lib/consent";
import { friendlyCheckoutError, readRememberedEmail, rememberCheckoutEmail, suggestEmailFix } from "@/lib/blackCheckout";
import { BLACK_OFFER, PRICE_TABLE, blackStatus, timeLeft, type BlackStatus } from "@/lib/pricingSchedule";
import { saveBlackLead } from "@/lib/blackLead";
import { brl } from "@/lib/subscription-tiers";
import { cn } from "@/lib/utils";
import { PlatformDemo } from "@/components/landing/PlatformDemo";
import { FounderSection } from "@/components/landing/FounderSection";
import { RealUsersCarousel } from "@/components/landing/RealUsersCarousel";
import { VslVideo } from "@/components/landing/VslVideo";
import { FormLegalNotice } from "@/components/legal/FormLegalNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { checkoutTracking } from "@/lib/conversion";
import { WhatsAppFloatingButton, WhatsAppInlineButton } from "@/components/landing/WhatsAppContact";
import { ANNUAL_BONUS } from "@/lib/annualBonus";
import { BLACK_PAGE_PLANS, type BlackPagePlanKey } from "@/lib/blackPagePlans";
import { REAL_USERS } from "@/data/realUsers";

const PRICE = BLACK_OFFER.amountCents / 100;
// "De/por" e "% off" usam o preço anual efetivamente praticado durante a oferta
// (novembro = preço de lançamento). Usar como referência um preço que ainda não
// foi cobrado (o de dezembro) é propaganda enganosa (CDC art. 37 / Procon).
const CURRENT_YEARLY = PRICE_TABLE.launch.yearlyCents / 100;
/** Preço anual a partir de 1º/12 — só aparece rotulado como preço futuro. */
const DECEMBER_YEARLY = BLACK_OFFER.anchorCents / 100;
const MONTHLY_FULL = PRICE_TABLE.full.monthlyCents / 100;
const PER_DAY = PRICE / 365;
const SAVINGS = DECEMBER_YEARLY - PRICE;
const SAVINGS_NOW = CURRENT_YEARLY - PRICE;

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
    q: "Como recebo o acesso depois de pagar?",
    a: "Assim que o pagamento é confirmado, enviamos um e-mail para o endereço que você informou com o link para entrar. Se você já tem conta, os 12 meses entram nela automaticamente.",
  },
  {
    q: "E se eu preferir pagar por mês?",
    a: `Também dá. No card de compra, toque em "Prefere outro plano?" para ver o plano mensal de ${brl(PRICE_TABLE.launch.monthlyCents / 100)} por mês no cartão, que você cancela quando quiser, e o anual de ${brl(PRICE_TABLE.launch.yearlyCents / 100)} com o e-book Arsenal Med incluso. A oferta de ${brl(PRICE)} pelo ano vale só para o plano Black, até 30/11.`,
  },
  {
    q: "Posso parcelar ou pagar com Pix ou boleto?",
    a: `Nesta oferta, o pagamento é único no cartão de crédito: ${brl(PRICE)} à vista, sem parcelamento, Pix ou boleto.`,
  },
  {
    q: "Como funciona a garantia de 7 dias?",
    a: "Se desistir em até 7 dias corridos do pagamento, devolvemos 100% do valor, sem precisar justificar. É só pedir pelo e-mail contato@medstation-ai.com.br com o e-mail da conta.",
  },
  {
    q: "A Black renova sozinha?",
    a: `Não. É um pagamento único de ${brl(PRICE)} que libera 12 meses de acesso, sem cobrança automática no fim.`,
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
    a: "Pode trocar pela Black aqui mesmo, com o e-mail da sua conta. Seu mensal é encerrado sozinho no fim do mês que você já pagou, sem cobrança dupla, e os 12 meses começam a contar depois desse dia.",
  },
  {
    q: "E depois de novembro?",
    a: `A partir de 1º de dezembro, a MedStation passa a custar ${brl(MONTHLY_FULL)} por mês ou ${brl(DECEMBER_YEARLY)} por ano.`,
  },
];

const MARQUEE_ITEMS = [
  "Black MedStation",
  `12 meses por ${brl(PRICE)}`,
  `Anual a ${brl(DECEMBER_YEARLY)} a partir de 1º/12`,
  "Até 30/11",
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

/**
 * Estado da oferta (antes/durante/depois). Confere a cada segundo, mas só
 * re-renderiza quando o estado muda: o relógio que bate todo segundo fica
 * dentro dos contadores, não na página inteira.
 */
function useBlackStatus(intervalMs = 1000): BlackStatus {
  const [status, setStatus] = useState<BlackStatus>(() => blackStatus(Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setStatus(blackStatus(Date.now())), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return status;
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

function Marquee({ tone = "gold", className }: { tone?: "gold" | "dark"; className?: string }) {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "overflow-hidden",
        dark ? "bg-offer text-offer-gold border-b border-offer-border" : "bg-offer-gold text-offer-gold-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <div className="flex w-max motion-safe:animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {row.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className={cn(
                  "flex items-center gap-4 px-4 font-mono font-semibold uppercase tracking-[0.2em] whitespace-nowrap",
                  dark ? "py-1.5 text-[0.62rem] md:text-[0.68rem]" : "py-2 text-[0.7rem] md:text-xs",
                )}
              >
                {item}
                <span className={cn("h-1.5 w-1.5 rotate-45", dark ? "bg-offer-accent" : "bg-offer-gold-foreground/70")} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Contador único da página (no topo). Sóbrio de propósito: sem ponto piscando
 * nem segundos em vermelho — o público é médico e desconfia de urgência de varejo.
 */
function Countdown({ target, label }: { target: string; label: string }) {
  const now = useClock();
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
          <div key={p.l} className="min-w-[3.8rem] rounded-lg border border-offer-border bg-offer-foreground/5 px-2 py-2 text-center">
            <div className="text-xl md:text-3xl font-semibold tabular-nums">{String(p.v).padStart(2, "0")}</div>
            <div className="text-[0.65rem] text-offer-muted">{p.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const OPEN_CHECKOUT_EVENT = "black:open-checkout";

/** Qualquer botão de compra da página abre o pop-up de e-mail no card. */
function openCheckout(cta: string, choice: BlackPagePlanKey = "black") {
  trackCtaClick({ cta, section: "black", destination: "checkout_popup" });
  window.dispatchEvent(new CustomEvent(OPEN_CHECKOUT_EVENT, { detail: { choice } }));
}

const POPUP_TITLE: Record<BlackPagePlanKey, string> = {
  black: "Plano Black anual",
  monthly: "Plano mensal",
  annual_arsenal: "Anual + Arsenal Med 3.0",
};

function CheckoutCard({ status }: { status: BlackStatus }) {
  const [email, setEmail] = useState(() => readRememberedEmail());
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChoice, setLoadingChoice] = useState<BlackPagePlanKey | null>(null);
  const [vipSaved, setVipSaved] = useState(false);
  const [popupChoice, setPopupChoice] = useState<BlackPagePlanKey | null>(null);
  const { toast } = useToast();
  const upcoming = status === "upcoming";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user?.email ?? null));
  }, []);

  // Botão clicado: quem está logado vai direto ao pagamento; os demais informam o e-mail no pop-up.
  const requestCheckout = (choice: BlackPagePlanKey) => {
    if (status === "ended" || loading) return;
    if (sessionEmail) {
      void startCheckout(choice);
      return;
    }
    setPopupChoice(choice);
  };

  const requestRef = useRef(requestCheckout);
  requestRef.current = requestCheckout;
  useEffect(() => {
    const onOpen = (event: Event) => {
      const choice = (event as CustomEvent<{ choice?: BlackPagePlanKey }>).detail?.choice ?? "black";
      requestRef.current(choice);
    };
    window.addEventListener(OPEN_CHECKOUT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHECKOUT_EVENT, onOpen);
  }, []);

  const submitPopup = (e: React.FormEvent) => {
    e.preventDefault();
    if (popupChoice) void startCheckout(popupChoice);
  };

  const startCheckout = async (choice: BlackPagePlanKey) => {
    if (status === "ended" || loading) return;
    const option = BLACK_PAGE_PLANS[choice];
    const clean = (sessionEmail ?? email).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ variant: "destructive", title: "E-mail inválido", description: "Confira o e-mail e tente de novo." });
      return;
    }
    setLoading(true);
    setLoadingChoice(choice);

    // Antes da abertura: entra na lista VIP e é avisado à meia-noite.
    if (status === "upcoming") {
      trackCtaClick({ cta: "black_vip", section: "black", destination: "vip_list" });
      await saveBlackLead(clean, "black_vip");
      setLoading(false);
      setLoadingChoice(null);
      setPopupChoice(null);
      setVipSaved(true);
      return;
    }

    // Guarda o contato antes do pagamento para recuperar quem desistir.
    await saveBlackLead(clean, option.leadSource);
    if (!sessionEmail) rememberCheckoutEmail(clean);
    try {
      if (hasMarketingConsent()) (window as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "Lead", { content_name: option.plan });
    } catch {
      /* noop */
    }
    trackCheckoutStarted({
      origin: "black_2026",
      product: "pro_completo",
      plan: option.plan,
      billing_period: option.billingPeriod,
      price_brl: option.priceBrl,
      auth_state: sessionEmail ? "authenticated" : "guest",
    });
    try {
      const { data, error } = sessionEmail
        ? await supabase.functions.invoke("create-checkout", {
          body: { tracking: checkoutTracking(), utm: campaignUtm(), plan: option.plan, billingPeriod: option.billingPeriod, entry: "black_page" },
        })
        : await supabase.functions.invoke("guest-checkout", {
          body: { tracking: checkoutTracking(), utm: campaignUtm(), email: clean, product: "pro_completo", billingPeriod: option.billingPeriod, plan: option.plan, entry: "black_page" },
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
        description: friendlyCheckoutError((err as Error)?.message),
      });
      setLoading(false);
      setLoadingChoice(null);
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
    <div
      id="assinar"
      className="relative overflow-hidden rounded-2xl border-2 border-offer-gold bg-card text-card-foreground p-5 md:p-7 shadow-[0_30px_80px_-30px_hsl(var(--offer-gold)/0.55)] scroll-mt-24"
    >
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-offer-hot" />
        <span className="text-sm font-semibold">Plano Black anual</span>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        de <span className="line-through decoration-offer-hot decoration-2">{brl(CURRENT_YEARLY)}</span> por
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-5xl md:text-6xl font-bold tracking-tight">{brl(PRICE)}</span>
        <span className="text-sm text-muted-foreground">/ano</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">pagamento único no cartão de crédito</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-offer-gold/20 px-2.5 py-1 font-semibold text-foreground">
          {brl(SAVINGS_NOW)} a menos que o anual de hoje
        </span>
        <span className="text-muted-foreground">Menos de {brl(Math.ceil(PER_DAY * 100) / 100)} por dia</span>
      </div>
      <p className="mt-3 rounded-lg border border-offer-gold/40 bg-offer-gold/10 px-3 py-2 text-xs leading-snug text-foreground">
        A partir de 1º/12 o anual passa a custar <span className="font-semibold">{brl(DECEMBER_YEARLY)}</span>. Garantindo
        agora, os seus 12 meses ficam em {brl(PRICE)}.
      </p>

      {upcoming && vipSaved ? (
        <div className="mt-6 rounded-xl border border-offer-gold/50 bg-offer-gold/10 p-4 text-sm" role="status">
          <p className="font-semibold">Pronto, você está na lista VIP.</p>
          <p className="mt-1 text-muted-foreground">
            Assim que a Black abrir, à meia-noite de 1º de novembro, é só voltar a esta página e garantir o seu ano.
          </p>
        </div>
      ) : (
      <div className="mt-6 space-y-3">
        {upcoming && (
          <p className="rounded-lg bg-offer-hot/10 px-3 py-2 text-xs text-foreground">
            A Black abre à meia-noite de 1º de novembro. Entre na lista VIP e seja avisado primeiro.
          </p>
        )}
        {sessionEmail && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Você vai assinar com a conta <span className="font-medium text-foreground">{sessionEmail}</span>.
          </p>
        )}
        <Button
          type="button"
          onClick={() => {
            trackCtaClick({ cta: "black_card", section: "black", destination: "checkout_popup" });
            requestCheckout("black");
          }}
          className={cn(
            "relative w-full h-14 text-base md:text-lg overflow-hidden",
            GOLD_BUTTON,
            !loading && "motion-safe:animate-cta-pulse",
          )}
          disabled={loading}
        >
          {!loading && (
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-offer-foreground/40 to-transparent motion-safe:animate-brand-sweep" />
          )}
          {loading && (upcoming || loadingChoice === "black") ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {upcoming ? "Salvando..." : "Abrindo pagamento..."}
            </>
          ) : upcoming ? (
            <>
              Quero entrar na lista VIP <ArrowRight className="w-5 h-5 ml-1.5" />
            </>
          ) : (
            <>
              {CTA_LABEL} <ArrowRight className="w-5 h-5 ml-1.5" />
            </>
          )}
        </Button>
        {!upcoming && (
          <OtherPlans
            loading={loading}
            loadingChoice={loadingChoice}
            onChoose={(choice) => {
              trackCtaClick({ cta: `black_card_${choice}`, section: "black", destination: "checkout_popup" });
              requestCheckout(choice);
            }}
          />
        )}
      </div>
      )}

      <ul className="mt-5 grid gap-1.5 text-xs text-muted-foreground" aria-label="Condições do plano Black anual">
        <li className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-primary" /> Cartão de crédito, em ambiente seguro
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> 7 dias de garantia incondicional
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-primary" /> Black anual: 12 meses de acesso, sem renovação automática
        </li>
      </ul>

      <CardTestimonials />
      <Dialog open={popupChoice !== null} onOpenChange={(open) => !open && !loading && setPopupChoice(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submitPopup} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {upcoming ? "Entrar na lista VIP" : popupChoice ? POPUP_TITLE[popupChoice] : ""}
                {!upcoming && popupChoice && (
                  <span className={cn("ml-2 font-bold", popupChoice === "black" ? "text-offer-gold" : "text-primary")}>
                    {brl(BLACK_PAGE_PLANS[popupChoice].priceBrl)}
                    {BLACK_PAGE_PLANS[popupChoice].billingPeriod === "monthly" ? "/mês" : "/ano"}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {upcoming
                  ? "Informe seu e-mail e avisamos assim que a Black abrir."
                  : "Informe seu melhor e-mail para seguir ao pagamento. Seu acesso chega nele."}
              </DialogDescription>
            </DialogHeader>
            <div>
              <label htmlFor="black-email" className="text-xs font-medium">
                Seu melhor e-mail
              </label>
              <Input
                id="black-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1.5 h-12"
                required
              />
              {suggestEmailFix(email) ? (
                <button
                  type="button"
                  onClick={() => setEmail(suggestEmailFix(email) ?? email)}
                  className="mt-1 text-left text-[0.75rem] font-medium text-offer-hot underline underline-offset-2"
                >
                  Você quis dizer {suggestEmailFix(email)}? Toque para corrigir.
                </button>
              ) : (
                <p className="mt-1 text-[0.7rem] text-muted-foreground">
                  Se já tem conta na MedStation, use o mesmo e-mail.
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-12 text-base font-semibold",
                popupChoice === "black" || upcoming ? GOLD_BUTTON : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {upcoming ? "Salvando..." : "Abrindo pagamento..."}
                </>
              ) : upcoming ? (
                "Quero entrar na lista VIP"
              ) : (
                <>
                  Continuar para o pagamento <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-muted-foreground">
              <Lock className="w-3 h-3" /> Pagamento seguro pela Stripe · 7 dias de garantia
            </p>
            <FormLegalNotice mentionsReminder />
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Dois depoimentos curtos junto ao card de compra (mesma fonte autorizada do carrossel). */
const CARD_TESTIMONIAL_NAMES = ["Dr. Pedro Rebouças", "Dra. Luciara Duarte"];

function CardTestimonials() {
  const people = REAL_USERS.filter((u) => u.quote && CARD_TESTIMONIAL_NAMES.includes(u.name));
  if (people.length === 0) return null;
  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      {people.map((u) => (
        <figure key={u.name} className="flex gap-3">
          <img
            src={u.photo}
            alt={`Foto de ${u.name}`}
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-full object-cover object-top"
          />
          <div className="min-w-0">
            <blockquote className="text-xs italic leading-snug text-foreground/85">“{u.quote}”</blockquote>
            <figcaption className="mt-1 text-[0.7rem] text-muted-foreground">
              <span className="font-medium text-foreground">{u.name}</span> · {u.practice}
            </figcaption>
          </div>
        </figure>
      ))}
    </div>
  );
}

function OtherPlans({
  loading,
  loadingChoice,
  onChoose,
}: {
  loading: boolean;
  loadingChoice: BlackPagePlanKey | null;
  onChoose: (choice: BlackPagePlanKey) => void;
}) {
  const monthly = BLACK_PAGE_PLANS.monthly;
  const annual = BLACK_PAGE_PLANS.annual_arsenal;
  // Recolhido por padrão: com os três planos lado a lado, quem estava em dúvida
  // ficava com o mensal ou não escolhia nenhum. A Black é a decisão principal.
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div id="outros-planos" className="pt-1 text-center">
        <button
          type="button"
          onClick={() => {
            trackCtaClick({ cta: "black_card_other_plans", section: "black", destination: "other_plans" });
            setOpen(true);
          }}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Prefere outro plano? Ver mensal e anual com o Arsenal Med
        </button>
      </div>
    );
  }
  return (
    <div id="outros-planos" className="pt-3">
      <div className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> outros planos <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-primary/40 bg-primary/5 p-3.5">
          <p className="text-sm font-semibold">Mensal</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{brl(monthly.priceBrl)}</span>
            <span className="text-xs text-muted-foreground">/mês</span>
          </p>
          <p className="mt-1 flex-1 text-[0.72rem] leading-snug text-muted-foreground">
            Cobrança mensal no cartão. Cancele quando quiser.
          </p>
          <Button
            type="button"
            onClick={() => onChoose("monthly")}
            disabled={loading}
            className="mt-3 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {loadingChoice === "monthly" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abrindo...
              </>
            ) : (
              "Assinar o mensal"
            )}
          </Button>
        </div>
        <div className="flex flex-col rounded-xl border border-primary/40 bg-primary/5 p-3.5">
          <p className="text-sm font-semibold">Anual + {ANNUAL_BONUS.name}</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{brl(annual.priceBrl)}</span>
            <span className="text-xs text-muted-foreground">/ano</span>
          </p>
          <p className="mt-1 flex-1 text-[0.72rem] leading-snug text-muted-foreground">
            Pagamento único, 12 meses, com o e-book {ANNUAL_BONUS.name} ({ANNUAL_BONUS.valueLabel}) incluso.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => onChoose("annual_arsenal")}
            disabled={loading}
            className="mt-3 h-11 w-full border-primary text-primary hover:bg-primary/10 font-semibold"
          >
            {loadingChoice === "annual_arsenal" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Abrindo...
              </>
            ) : (
              "Anual com o Arsenal Med"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoldCta({ cta, className }: { cta: string; className?: string }) {
  return (
    <Button
      size="lg"
      onClick={() => openCheckout(cta)}
      className={cn("h-14 px-7 text-base", GOLD_BUTTON, className)}
    >
      {CTA_LABEL} <ArrowRight className="w-5 h-5 ml-1.5" />
    </Button>
  );
}

const highlights = [
  {
    icon: Lock,
    title: "Preço travado por 12 meses",
    text: `Em dezembro a MedStation sobe para ${brl(DECEMBER_YEARLY)} por ano. Você segue o ano inteiro sem nenhum reajuste.`,
  },
  {
    icon: ShieldCheck,
    title: "7 dias de garantia incondicional",
    text: "Use à vontade na sua rotina. Se não fizer sentido para você nos primeiros 7 dias, devolvemos 100% do valor.",
  },
  {
    icon: CalendarCheck,
    title: "Paga uma vez, sem surpresa",
    text: "Pagamento único no cartão de crédito. Nada de cobrança automática no fim dos 12 meses.",
  },
];

export default function Black() {
  const status = useBlackStatus();
  const [params] = useSearchParams();
  const canceled = params.get("canceled") === "true";
  const active = status === "active";

  // A Black é sempre escura: força o tema escuro enquanto a página está aberta
  // (inclui janelas e avisos que abrem fora da página) e restaura ao sair.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const hadLight = root.classList.contains("light");
    const prevScheme = root.style.colorScheme;
    const apply = () => {
      if (!root.classList.contains("dark") || root.classList.contains("light")) {
        root.classList.remove("light");
        root.classList.add("dark");
      }
      if (root.style.colorScheme !== "dark") root.style.colorScheme = "dark";
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      observer.disconnect();
      if (!hadDark) root.classList.remove("dark");
      if (hadLight) root.classList.add("light");
      root.style.colorScheme = prevScheme;
    };
  }, []);

  return (
    <div className={cn("dark min-h-screen bg-background text-foreground", active && "pb-20 md:pb-0")}>
      <Seo
        path="/black"
        title="Black MedStation — um ano inteiro por R$ 399,90"
        description={`Só em novembro: o plano anual completo da MedStation de ${brl(CURRENT_YEARLY)} por ${brl(PRICE)}, em pagamento único no cartão. 7 dias de garantia.`}
      />

      <div className="sticky top-0 z-30">
        <Marquee tone="dark" />
        <header className="border-b border-offer-border bg-offer/90 text-offer-foreground backdrop-blur-md">
          <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
            <Link to="/" aria-label="MedStation" className="flex items-center gap-3">
              <Logo size="sm" className="[&>span]:text-offer-foreground" />
              <span className="hidden sm:inline-flex rounded-sm border border-offer-gold/50 px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-offer-gold">
                Black
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-offer-muted hover:bg-offer-foreground/10 hover:text-offer-foreground"
              >
                <Link to="/auth" onClick={() => trackCtaClick({ cta: "black_login", section: "black", destination: "/auth" })}>
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Já sou cliente</span>
                </Link>
              </Button>
              {active && (
                <Button size="sm" className={GOLD_BUTTON} onClick={() => openCheckout("black_header")}>
                  Assinar Black
                </Button>
              )}
            </div>
          </div>
        </header>
      </div>

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
        <div className="relative container mx-auto px-4 md:px-8 pt-10 pb-16 md:pt-16 md:pb-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center lg:items-start">
          <div className="motion-safe:animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-offer-gold/40 bg-offer-gold/10 px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-offer-gold">
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
            <p className="mt-6 max-w-xl text-lg md:text-2xl font-medium leading-snug text-offer-foreground">
              Economize até <span className="text-offer-gold">40 horas</span> de trabalho burocrático e repetitivo por mês na
              sua prática médica.<sup className="text-offer-muted">*</sup>
            </p>
            <p className="mt-4 max-w-xl text-sm md:text-base text-offer-muted leading-relaxed">
              Em 1º de dezembro, o plano anual passa a custar{" "}
              <span className="text-offer-foreground font-semibold">{brl(DECEMBER_YEARLY)}</span>. Garantindo em novembro,
              você paga <span className="text-offer-gold font-semibold">{brl(PRICE)}</span> pelos 12 meses, sem reajuste.
            </p>
            <VslVideo className="mt-6" />
            {active && (
              <Button
                className={cn("mt-4 h-auto min-h-12 w-full whitespace-normal py-3 text-base leading-snug lg:hidden", GOLD_BUTTON)}
                onClick={() => openCheckout("black_hero_mobile")}
              >
                Quero garantir meu ano com a MedStation agora <ArrowRight className="w-4 h-4 ml-1.5 shrink-0" />
              </Button>
            )}
            <p className="mt-4 max-w-xl text-base md:text-lg text-offer-muted leading-relaxed">
              Evoluções, receitas, atestados e anamneses prontos em segundos, para você voltar ao que importa: o paciente. Tudo isso
              por <span className="text-offer-foreground font-semibold">{brl(PER_DAY)} por dia</span>.
            </p>
            <p className="mt-3 max-w-xl text-xs text-offer-muted leading-relaxed">
              * Estimativa baseada em 15 atendimentos por dia, 22 dias por mês, com economia média de 7,5 minutos por
              atendimento. O ganho real depende do seu volume e do seu uso.
            </p>

            <div className="mt-8">
              {active && <Countdown target={BLACK_OFFER.endsAt} label="A oferta termina em" />}
              {status === "upcoming" && <Countdown target={BLACK_OFFER.startsAt} label="A Black começa em" />}
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

      <main className="container mx-auto px-4 md:px-8 py-12 md:py-20 space-y-16 md:space-y-20">
        <section className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Tudo o que entra no seu ano</h2>
            <p className="mt-3 text-muted-foreground">A MedStation completa, com todos os assistentes liberados.</p>
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
                <BadgePercent className="w-4 h-4 text-foreground" /> Compare e decida
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg px-3 py-3">
                  <dt className="text-muted-foreground">Mensal, a partir de 1º/12</dt>
                  <dd className="text-muted-foreground">
                    {brl(MONTHLY_FULL * 12)}/ano
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg px-3 py-3">
                  <dt className="text-muted-foreground">Anual hoje, até 30/11</dt>
                  <dd className="text-muted-foreground">
                    <span className="line-through">{brl(CURRENT_YEARLY)}</span>/ano
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg px-3 py-3">
                  <dt className="text-muted-foreground">Anual, a partir de 1º/12</dt>
                  <dd className="text-muted-foreground">
                    {brl(DECEMBER_YEARLY)}/ano
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-offer-gold bg-offer-gold/10 px-3 py-3">
                  <dt className="font-semibold">Black MedStation</dt>
                  <dd className="text-right"><span className="block text-lg font-bold">{brl(PRICE)}</span><span className="text-xs text-muted-foreground">pagamento único</span></dd>
                </div>
              </dl>
              <p className="mt-4 text-sm">
                São <span className="font-semibold">{brl(SAVINGS)} a menos</span> que o anual a partir de 1º/12.
              </p>
            </div>
          </Reveal>
        </section>

        <PlatformDemo />
        {active && (
          <div className="-mt-6 md:-mt-8 flex justify-center">
            <GoldCta cta="black_demo" />
          </div>
        )}

        <RealUsersCarousel />
        <FounderSection />

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
            <div className="mt-8 rounded-xl border border-border/70 bg-card/60 p-5 text-center">
              <p className="text-sm font-semibold">Ainda ficou com dúvida?</p>
              <p className="mt-1 text-sm text-muted-foreground">Fale direto comigo, Artur, médico e fundador da MedStation.</p>
              <WhatsAppInlineButton className="mt-4" />
            </div>
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
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-offer-gold">Black MedStation · até 30/11</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-tight">
              {brl(PRICE)} por 12 meses.
            </h2>
            <p className="mt-3 text-sm md:text-base text-offer-muted">
              A partir de 1º/12, o anual passa a {brl(DECEMBER_YEARLY)}.
            </p>
            <GoldCta cta="black_footer" className="mt-8" />
            <p className="mt-3 text-xs text-offer-muted">7 dias de garantia · Cartão de crédito · Sem renovação automática</p>
          </Reveal>
        </section>
      )}

      <SiteFooter />

      <WhatsAppFloatingButton aboveStickyBar={active} />

      {/* Barra fixa no celular */}
      {active && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-offer-border bg-offer/95 px-4 py-3 text-offer-foreground backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 leading-tight">
              <p className="text-[0.65rem] text-offer-muted line-through">{brl(CURRENT_YEARLY)}</p>
              <p className="text-base font-bold text-offer-gold">{brl(PRICE)}<span className="text-xs font-normal text-offer-muted">/ano</span></p>
            </div>
            <Button className={cn("h-12 flex-1 text-sm", GOLD_BUTTON)} onClick={() => openCheckout("black_sticky_mobile")}>
              {CTA_LABEL}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
