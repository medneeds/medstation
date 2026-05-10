import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, ShieldCheck, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const proAgents = [
  { name: "Examinus", desc: "Extração e formatação de exames laboratoriais e de imagem" },
  { name: "Clínicus", desc: "Anamneses hospitalares estruturadas e passagem de plantão" },
  { name: "Scorius", desc: "Cálculo e interpretação de scores clínicos e escalas prognósticas" },
  { name: "Numerus", desc: "Calculadoras médicas e conversão de unidades" },
  { name: "Prescriptus", desc: "Prescrições estruturadas com Bula Inteligente integrada" },
  { name: "CODexus", desc: "Codificação CID-10, TISS e procedimentos médicos" },
  { name: "Gasometrus", desc: "Análise completa e interpretação de gasometria arterial" },
  { name: "Atestus", desc: "Geração de atestados médicos e declarações" },
  { name: "Protocolus", desc: "Consulta a protocolos e guidelines nacionais e internacionais" },
  { name: "Orientus", desc: "Orientações ao paciente e instruções de alta hospitalar" },
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleApplyCoupon = () => {
    const trimmedCode = couponCode.trim();
    if (!trimmedCode) {
      toast({
        title: "Código inválido",
        description: "Por favor, digite um código de cupom válido.",
        variant: "destructive",
      });
      return;
    }
    setCouponApplied(true);
    toast({
      title: "Cupom aplicado!",
      description: `Código ${trimmedCode} será aplicado no checkout.`,
    });
  };

  const handleSubscribe = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Logged in → use create-checkout (current customer flow)
      if (session) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: {
            couponCode: couponApplied ? couponCode.trim() : undefined,
            billingPeriod,
          },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        return;
      }

      // Guest → require email and use guest-checkout (same flow as homepage)
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        toast({
          title: "Email necessário",
          description: "Digite seu email para iniciar a assinatura.",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: {
          email: trimmedEmail,
          billingPeriod,
          couponCode: couponApplied ? couponCode.trim() : undefined,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro no checkout",
        description: error.message || "Não foi possível iniciar o checkout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:py-16 lg:py-20 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14 space-y-4">
          <span className="inline-block text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground border border-hairline rounded-sm px-2.5 py-1">
            Planos & Assinatura
          </span>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground leading-[1.05]">
            Comece grátis, <span className="italic text-primary">evolua quando quiser</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Examinus grátis para experimentar (com restrições). Pro libera os 10 assistentes <span className="italic text-foreground">verdadeiramente ilimitados</span>, sem espera e sem pop-ups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Plano Grátis */}
          <Card className="p-6 md:p-8 text-left border border-hairline bg-card/60 backdrop-blur-sm h-full flex flex-col">
            <div className="flex flex-col flex-1 space-y-5">
              <div>
                <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground">
                  Sempre grátis
                </span>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight mt-1.5">Grátis</h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Examinus para experimentar — com restrições
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display text-4xl md:text-5xl tracking-tight">R$ 0</span>
                <span className="text-base text-muted-foreground">/sempre</span>
              </div>

              <ul className="space-y-2.5 text-sm flex-1">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    <strong className="text-foreground">Apenas Examinus:</strong>{" "}
                    extração e formatação de exames laboratoriais e de imagem
                  </span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>Aceita PDFs, fotos e textos confusos — qualquer formato</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2 flex-shrink-0" />
                  <span><strong className="text-foreground">Cota limitada por sessão:</strong> após poucas extrações, o uso é bloqueado temporariamente</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2 flex-shrink-0" />
                  <span><strong className="text-foreground">Tempo de espera entre extrações</strong> (cooldown) que aumenta conforme o volume</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2 flex-shrink-0" />
                  <span><strong className="text-foreground">Pop-ups de upgrade</strong> e processamento mais lento em horário de pico</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-amber-500/80 mt-2 flex-shrink-0" />
                  <span>Os outros 9 assistentes ficam <strong className="text-foreground">bloqueados</strong></span>
                </li>
              </ul>

              <div className="space-y-3 mt-auto">
                <Button
                  variant="outline"
                  className="w-full h-12"
                  onClick={() => navigate("/auth")}
                >
                  Criar conta grátis
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Sem cartão • Sem compromisso
                </p>
              </div>
            </div>
          </Card>

          {/* Plano Pro */}
          <Card className="p-6 md:p-8 text-left border border-primary/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute -top-1 -right-1">
              <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] font-mono rounded-sm">
                Recomendado
              </Badge>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-primary">
                  Plano Pro
                </span>
                <h2 className="font-display text-2xl md:text-3xl tracking-tight mt-1.5 text-primary">
                  MedStation AI Pro
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  10 assistentes IA especializados
                </p>
              </div>

              {/* Billing toggle */}
              <div className="inline-flex p-1 border border-hairline rounded-md bg-muted/40">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                    billingPeriod === "monthly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`relative px-3 py-1.5 rounded-sm text-xs font-mono uppercase tracking-[0.14em] transition-colors ${
                    billingPeriod === "yearly"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual
                  <span className="ml-1.5 text-[0.6rem] text-primary/90 font-semibold">−16%</span>
                </button>
              </div>

              {/* Price */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full mb-3">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] font-mono text-primary">
                    {billingPeriod === "yearly" ? "Oferta especial anual" : "Oferta especial"}
                  </span>
                </div>
                {billingPeriod === "yearly" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground line-through decoration-1">
                      De R$ 358,80/ano (12 × R$ 29,90)
                    </span>
                  </div>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                    {billingPeriod === "monthly" ? "R$ 29,90" : "R$ 299,90"}
                  </span>
                  <span className="text-base text-muted-foreground">
                    {billingPeriod === "monthly" ? "/mês" : "/ano"}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-md border border-hairline mt-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] md:text-xs text-muted-foreground">
                    {billingPeriod === "yearly"
                      ? <>Equivale a <span className="font-medium text-foreground">R$ 24,99/mês</span> — economize <span className="font-medium text-foreground">R$ 58,90</span></>
                      : <>Ou <span className="font-medium text-foreground">R$ 299,90/ano</span> — economize R$ 58,90</>}
                  </span>
                </div>
              </div>

              {/* Agents list */}
              <div>
                <div className="text-[0.65rem] uppercase tracking-[0.22em] font-mono text-muted-foreground mb-3">
                  Inclui
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs md:text-sm">
                  {proAgents.map((agent) => (
                    <li key={agent.name} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{agent.name}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Garantia */}
              <div className="flex items-start gap-3 p-3 md:p-4 border border-hairline rounded-md bg-muted/30">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display text-sm tracking-tight text-foreground">
                    Garantia de 7 dias
                  </h4>
                  <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Teste sem risco. Se não gostar, devolvemos 100% do valor. Sem perguntas.
                  </p>
                </div>
              </div>

              {/* Coupon */}
              <div>
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="text"
                        placeholder="Código do cupom"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponApplied(false);
                        }}
                        className="flex-1 h-10 text-sm"
                        disabled={couponApplied}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || couponApplied}
                          className="flex-1 sm:flex-none h-10"
                        >
                          Aplicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCoupon(false);
                            setCouponCode("");
                            setCouponApplied(false);
                          }}
                          className="flex-1 sm:flex-none h-10"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                    {couponApplied && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Check className="w-3.5 h-3.5" />
                        Cupom aplicado com sucesso
                      </div>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10 text-base"
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 md:h-13 text-sm md:text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Assinar agora
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-[11px] md:text-xs text-center text-muted-foreground">
                Você criará sua senha no checkout • Cancele quando quiser • Sem multa
              </p>
            </div>
          </Card>
        </div>

        {/* Trust */}
        <div className="mt-12 md:mt-16 grid grid-cols-3 gap-3 md:gap-6 text-center max-w-3xl mx-auto">
          {[
            { value: "99.9%", label: "Uptime" },
            { value: "LGPD", label: "Compliance" },
            { value: "24/7", label: "Disponível" },
          ].map((item) => (
            <div key={item.label} className="border border-hairline rounded-md py-4 px-2 bg-card/40">
              <div className="font-display text-xl md:text-2xl tracking-tight text-foreground">
                {item.value}
              </div>
              <div className="text-[10px] md:text-xs uppercase tracking-[0.18em] font-mono text-muted-foreground mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
