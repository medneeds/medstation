import { Seo } from "@/components/Seo";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, ShieldCheck, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { GuestEmailDialog } from "@/components/GuestEmailDialog";
import { DISPLAY_PRICING, brl, type PlanSlug } from "@/lib/subscription-tiers";
import { TimeSavingsComparison } from "@/components/TimeSavingsComparison";
import { trackCtaClick, trackCheckoutStarted } from "@/lib/analytics";

const included = [
  "Examinus — exames e laudos resumidos",
  "Clínicus — anamnese e evolução estruturadas",
  "Prescriptus — conduta e prescrição com alertas",
  "Gasometrus — gasometria interpretada",
  "Protocolus — protocolos direto ao ponto",
  "Orientus — orientação de alta ao paciente",
  "Atestus — atestados prontos",
  "Mediscuss — discussão de caso complexo",
  "Legalis — proteção jurídica e ética",
  "Codexus — CID e codificação",
  "Numerus — escores e cálculos de beira de leito",
  "Scorius — estratificação de risco",
  "Modo Escuta — ouve o atendimento e devolve a anamnese pronta",
  "Modo Rotineiro — mapa de leitos e evolução diária com o Carpe Diem",
];

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<PlanSlug | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [pendingPlan, setPendingPlan] = useState<PlanSlug | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscribed, isTrial, subscriptionEnd, loading: subLoading } = useSubscription();

  const isYearly = billingPeriod === "yearly";
  const plan: PlanSlug = isYearly ? "pro_completo_yearly" : "pro_completo";
  const price = isYearly ? DISPLAY_PRICING.bundle.yearly : DISPLAY_PRICING.bundle.monthly;

  const handleApplyCoupon = () => {
    const trimmedCode = couponCode.trim();
    if (!trimmedCode) {
      toast({ title: "Código inválido", description: "Digite um código de cupom válido.", variant: "destructive" });
      return;
    }
    setCouponApplied(true);
    toast({ title: "Cupom aplicado!", description: `Código ${trimmedCode} será aplicado no checkout.` });
  };

  const runGuestCheckout = async (p: PlanSlug, email: string) => {
    setLoadingPlan(p);
    trackCheckoutStarted({
      origin: "pricing_page",
      plan: p,
      billing_period: billingPeriod,
      auth_state: "guest",
      coupon: couponApplied ? couponCode.trim() : null,
    });
    try {
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email, plan: p, couponCode: couponApplied ? couponCode.trim() : undefined },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Erro no checkout", description: error.message || "Não foi possível iniciar o checkout.", variant: "destructive" });
      setLoadingPlan(null);
    }
  };

  const startCheckout = async (p: PlanSlug) => {
    setLoadingPlan(p);
    trackCtaClick({
      cta: `pricing_${p}`,
      section: "pricing_page",
      plan: p,
      billing_period: billingPeriod,
      destination: "checkout",
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        trackCheckoutStarted({
          origin: "pricing_page",
          plan: p,
          billing_period: billingPeriod,
          auth_state: "authenticated",
          coupon: couponApplied ? couponCode.trim() : null,
        });
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan: p, couponCode: couponApplied ? couponCode.trim() : undefined },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      setPendingPlan(p);
      setDialogOpen(true);
      setLoadingPlan(null);
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Erro no checkout", description: error.message || "Não foi possível iniciar o checkout.", variant: "destructive" });
      setLoadingPlan(null);
    }
  };

  const loading = loadingPlan !== null;
  const trialEnd = isTrial && subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString("pt-BR") : null;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        path="/pricing"
        title="Plano único — MedStation"
        description="Um único plano com a plataforma inteira: 12 assistentes clínicos, Modo Escuta e Modo Rotineiro. Teste 7 dias grátis, sem cartão."
      />
      <div className="container mx-auto px-4 py-10 md:py-16 lg:py-20 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14 space-y-4">
          <span className="inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border border-hairline rounded-sm px-2.5 py-1">
            Plano único
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground leading-[1.05]">
            Produza mais. <span className="italic text-primary">Digite menos.</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Uma assinatura, a plataforma inteira: os 12 assistentes clínicos, o Modo Escuta e o Modo
            Rotineiro. Sem módulos separados.
          </p>

          <div className="inline-flex p-1 border border-hairline rounded-md bg-muted/40 mt-4">
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod("yearly")}
              className={`relative px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                billingPeriod === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span className="ml-1.5 text-[0.6rem] text-primary/90 font-semibold">2 meses grátis</span>
            </button>
          </div>
        </div>

        {trialEnd && (
          <Card className="mb-8 p-4 md:p-5 border border-primary/40 bg-primary/5 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-xs md:text-sm text-muted-foreground">
              Seu teste gratuito está ativo até <strong className="text-foreground">{trialEnd}</strong>.
              Assine para continuar com tudo liberado depois dessa data.
            </p>
          </Card>
        )}

        <div className="mb-10 md:mb-14">
          <TimeSavingsComparison />
        </div>

        {/* Plano único */}
        <Card className="p-6 md:p-8 border border-primary/50 bg-card/85 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-10 items-start">
            <div>
              <Badge variant="secondary" className="mb-3">MedStation Completo</Badge>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                  {brl(price.now)}
                </span>
                <span className="text-base text-muted-foreground">{isYearly ? "/ano" : "/mês"}</span>
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-2">
                {isYearly
                  ? `Equivale a ${brl(price.now / 12)} por mês.`
                  : `Menos de ${brl(price.now / 30)} por dia.`}
              </p>

              <div className="mt-4 rounded-md border border-primary/25 bg-primary/5 p-3 text-[11px] md:text-xs leading-relaxed">
                <strong className="text-primary">Aviso de reajuste:</strong> em breve o plano passa a
                custar {brl(99.9)} por mês ou {brl(999.9)} por ano. Quem assinar agora mantém o valor
                atual por pelo menos 12 meses.

              </div>

              <Button
                size="lg"
                className="w-full h-12 mt-5"
                onClick={() => startCheckout(plan)}
                disabled={loading || (subscribed && !isTrial && !subLoading)}
              >
                {subscribed && !isTrial ? (
                  "Plano ativo"
                ) : loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <>Assinar agora <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              <div className="mt-4">
                {!showCoupon ? (
                  <button
                    type="button"
                    onClick={() => setShowCoupon(true)}
                    className="text-xs text-primary hover:underline font-mono uppercase tracking-[0.14em]"
                  >
                    Tem um cupom?
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Cupom"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponApplied(false); }}
                        className="h-10 text-sm w-36"
                        disabled={couponApplied}
                      />
                      <Button size="sm" onClick={handleApplyCoupon} disabled={!couponCode.trim() || couponApplied} className="h-10">
                        Aplicar
                      </Button>
                    </div>
                    {couponApplied && (
                      <div className="flex items-center gap-1.5 text-xs text-primary">
                        <Check className="w-3.5 h-3.5" /> Aplicado
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs md:text-sm">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ainda não tem conta?{" "}
          <button type="button" onClick={() => navigate("/auth")} className="text-primary hover:underline">
            Cadastre-se
          </button>{" "}
          e use a plataforma inteira por 7 dias, sem cartão de crédito.
        </p>

        {/* Garantia */}
        <div className="mt-8 flex items-start gap-3 p-4 md:p-5 border border-hairline rounded-md bg-muted/30 max-w-3xl mx-auto">
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-sm tracking-tight text-foreground">Garantia de 7 dias</h4>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Assinou e não gostou? Devolvemos 100% do valor. Sem perguntas.
            </p>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-12 md:mt-16 grid grid-cols-3 gap-3 md:gap-6 text-center max-w-3xl mx-auto">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "LGPD", label: "Compliance" },
            { value: "24/7", label: "Disponível" },
          ].map((item) => (
            <div key={item.label} className="border border-hairline rounded-md py-4 px-2 bg-card/40">
              <div className="font-display text-xl md:text-2xl tracking-tight text-foreground">{item.value}</div>
              <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] font-mono text-muted-foreground mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <GuestEmailDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setPendingPlan(null); }}
        planLabel="MedStation Completo"
        priceLabel={`${brl(price.now)}${isYearly ? "/ano" : "/mês"}`}
        loading={loadingPlan !== null}
        onConfirm={(email) => { if (pendingPlan) runGuestCheckout(pendingPlan, email); }}
      />
    </div>
  );
}
