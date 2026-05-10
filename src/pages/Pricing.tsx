import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, ShieldCheck, Mail, Loader2, Sparkles, Mic, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { PlanSlug } from "@/lib/subscription-tiers";

const proAgents = [
  "Examinus", "Clínicus", "Scorius", "Numerus", "Prescriptus",
  "CODexus", "Gasometrus", "Atestus", "Protocolus", "Orientus",
];

const consultorioFeatures = [
  "Transcrição em tempo real da consulta",
  "AHE estruturada gerada automaticamente",
  "Anti-alucinação em 3 camadas",
  "Áudio processado com Whisper médico",
  "Pronto para colar no prontuário",
];

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<PlanSlug | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasAgents, hasConsultorio, availableUpgrade, loading: subLoading } = useSubscription();

  const handleApplyCoupon = () => {
    const trimmedCode = couponCode.trim();
    if (!trimmedCode) {
      toast({ title: "Código inválido", description: "Digite um código de cupom válido.", variant: "destructive" });
      return;
    }
    setCouponApplied(true);
    toast({ title: "Cupom aplicado!", description: `Código ${trimmedCode} será aplicado no checkout.` });
  };

  const startCheckout = async (plan: PlanSlug) => {
    setLoadingPlan(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { plan, couponCode: couponApplied ? couponCode.trim() : undefined },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      // Guest flow — only standalone plans allowed
      if (plan === "agents_upgrade" || plan === "consultorio_upgrade") {
        navigate("/auth");
        return;
      }
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        toast({ title: "Email necessário", description: "Digite seu email para iniciar a assinatura.", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email: trimmedEmail, plan, couponCode: couponApplied ? couponCode.trim() : undefined },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Erro no checkout", description: error.message || "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const agentsPlan: PlanSlug = billingPeriod === "yearly" ? "agents_yearly" : "agents_monthly";
  const consultorioPlan: PlanSlug = billingPeriod === "yearly" ? "consultorio_yearly" : "consultorio_monthly";
  const pro2Plan: PlanSlug = billingPeriod === "yearly" ? "pro2_bundle_yearly" : "pro2_bundle";

  const isYearly = billingPeriod === "yearly";

  // Display values per plan
  const agentsPrice = isYearly ? "R$ 299,90" : "R$ 29,90";
  const agentsSuffix = isYearly ? "/ano" : "/mês";
  const agentsHint = isYearly ? "Equivale a R$ 24,99/mês — economize R$ 58,90" : null;

  const consultorioPrice = isYearly ? "R$ 299,90" : "R$ 29,90";
  const consultorioSuffix = isYearly ? "/ano" : "/mês";
  const consultorioHint = isYearly ? "Equivale a R$ 24,99/mês — economize R$ 58,90" : null;

  const pro2Price = isYearly ? "R$ 499,90" : "R$ 49,90";
  const pro2Suffix = isYearly ? "/ano" : "/mês";
  const pro2Hint = isYearly
    ? "Equivale a R$ 41,66/mês — economize R$ 98,90"
    : "Economize R$ 9,90/mês em vez de assinar separado";

  // Conditional cross-upgrade
  const upgradeBanner = (() => {
    if (subLoading) return null;
    if (availableUpgrade === "consultorio_upgrade" && hasAgents && !hasConsultorio) {
      return {
        title: "Você já tem os 10 Assistentes",
        desc: "Adicione o Modo Consultório com transcrição em tempo real e AHE estruturada por um preço exclusivo.",
        cta: "Adicionar Modo Consultório por R$ 19,90/mês",
        plan: "consultorio_upgrade" as PlanSlug,
      };
    }
    if (availableUpgrade === "agents_upgrade" && hasConsultorio && !hasAgents) {
      return {
        title: "Você já tem o Modo Consultório",
        desc: "Complete sua estação com os 10 Assistentes MedStation por um preço exclusivo de assinante.",
        cta: "Adicionar 10 Assistentes por R$ 19,90/mês",
        plan: "agents_upgrade" as PlanSlug,
      };
    }
    return null;
  })();

  const isLoading = (p: PlanSlug) => loadingPlan === p;
  const anyLoading = loadingPlan !== null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:py-16 lg:py-20 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14 space-y-4">
          <span className="inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border border-hairline rounded-sm px-2.5 py-1">
            Planos & Assinatura
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground leading-[1.05]">
            Produza mais. <span className="italic text-primary">Digite menos.</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Os 10 Assistentes e o Modo Consultório são <span className="text-foreground font-medium">produtos separados</span>. Assine só o que usa, ou junte os dois no MedStation AI Pro 2.
          </p>

          {/* Shared billing toggle */}
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
              <span className="ml-1.5 text-[0.6rem] text-primary/90 font-semibold">−16%</span>
            </button>
          </div>
        </div>

        {/* Cross-upgrade banner */}
        {upgradeBanner && (
          <Card className="mb-8 md:mb-10 p-5 md:p-6 border border-primary/40 bg-primary/5 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-primary mb-1">
                  Oferta de assinante
                </div>
                <h3 className="font-display text-lg md:text-xl tracking-tight text-foreground">
                  {upgradeBanner.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {upgradeBanner.desc}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => startCheckout(upgradeBanner.plan)}
                disabled={anyLoading}
                className="w-full md:w-auto h-12"
              >
                {isLoading(upgradeBanner.plan) ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <>{upgradeBanner.cta} <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* 3 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Card 1 — Agents */}
          <Card className="p-6 md:p-7 text-left border border-hairline bg-card/70 backdrop-blur-sm flex flex-col">
            <div className="flex flex-col flex-1 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                    10 Assistentes
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">MedStation AI Pro</h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Os 10 assistentes IA — ilimitado, sem cooldown, sem pop-ups.
                </p>
              </div>

              {/* Billing toggle */}
              <div className="inline-flex p-1 border border-hairline rounded-md bg-muted/40 self-start">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                    billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod("yearly")}
                  className={`relative px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                    billingPeriod === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual
                  <span className="ml-1.5 text-[0.6rem] text-primary/90 font-semibold">−16%</span>
                </button>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                    {billingPeriod === "monthly" ? "R$ 29,90" : "R$ 299,90"}
                  </span>
                  <span className="text-base text-muted-foreground">
                    {billingPeriod === "monthly" ? "/mês" : "/ano"}
                  </span>
                </div>
                {billingPeriod === "yearly" && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Equivale a <span className="text-foreground font-medium">R$ 24,99/mês</span> — economize R$ 58,90
                  </p>
                )}
              </div>

              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs flex-1">
                {proAgents.map((name) => (
                  <li key={name} className="flex items-center gap-1.5 text-muted-foreground">
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-foreground">{name}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full h-12 mt-auto"
                onClick={() => startCheckout(agentsPlan)}
                disabled={anyLoading || hasAgents}
              >
                {hasAgents ? (
                  "Plano ativo"
                ) : isLoading(agentsPlan) ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <>Assinar <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>

          {/* Card 2 — Pro 2 Bundle (recommended) */}
          <Card className="p-6 md:p-7 text-left border border-primary/50 bg-card/85 backdrop-blur-sm flex flex-col relative overflow-hidden lg:scale-[1.02]">
            <div className="absolute -top-1 -right-1">
              <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] font-mono rounded-sm">
                Recomendado
              </Badge>
            </div>

            <div className="flex flex-col flex-1 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-primary">
                    Estação completa
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight text-primary">
                  MedStation AI Pro 2
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  10 Assistentes + Modo Consultório no mesmo plano.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                    R$ 49,90
                  </span>
                  <span className="text-base text-muted-foreground">/mês</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Economize <span className="text-foreground font-medium">R$ 9,90/mês</span> em vez de assinar separado
                </p>
              </div>

              <ul className="space-y-2 text-xs md:text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Os 10 Assistentes MedStation</strong> ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground"><strong>Modo Consultório</strong> com transcrição em tempo real</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">AHE estruturada e anti-alucinação em 3 camadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Suporte prioritário e novos recursos primeiro</span>
                </li>
              </ul>

              <Button
                size="lg"
                className="w-full h-12 mt-auto"
                onClick={() => startCheckout("pro2_bundle")}
                disabled={anyLoading || (hasAgents && hasConsultorio)}
              >
                {hasAgents && hasConsultorio ? (
                  "Plano ativo"
                ) : isLoading("pro2_bundle") ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <>Assinar Pro 2 <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>

          {/* Card 3 — Consultório */}
          <Card className="p-6 md:p-7 text-left border border-hairline bg-card/70 backdrop-blur-sm flex flex-col">
            <div className="flex flex-col flex-1 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-primary" />
                  <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                    Tempo real
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">Modo Consultório</h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Grave a consulta, receba a AHE pronta. Sem digitar.
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                    R$ 29,90
                  </span>
                  <span className="text-base text-muted-foreground">/mês</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Já assina os 10 Assistentes? Adicione por <span className="text-primary font-medium">R$ 19,90/mês</span>
                </p>
              </div>

              <ul className="space-y-2 text-xs md:text-sm flex-1">
                {consultorioFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 mt-auto"
                onClick={() => startCheckout("consultorio_monthly")}
                disabled={anyLoading || hasConsultorio}
              >
                {hasConsultorio ? (
                  "Plano ativo"
                ) : isLoading("consultorio_monthly") ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <>Assinar Consultório <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Guest email + coupon */}
        <Card className="mt-8 md:mt-10 p-5 md:p-6 border border-hairline bg-card/50 backdrop-blur-sm max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-6 items-end">
            <div>
              <label className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                Novo por aqui? Comece pelo email
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 text-base"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Você criará a senha no checkout. Já tem conta? Faça login antes para destravar os preços de upgrade.
              </p>
            </div>
            <div className="md:pb-1">
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
        </Card>

        {/* Garantia */}
        <div className="mt-8 flex items-start gap-3 p-4 md:p-5 border border-hairline rounded-md bg-muted/30 max-w-3xl mx-auto">
          <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-sm tracking-tight text-foreground">Garantia de 7 dias</h4>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Teste sem risco. Se não gostar, devolvemos 100% do valor. Sem perguntas.
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
    </div>
  );
}
