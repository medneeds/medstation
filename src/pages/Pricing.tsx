import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Definição centralizada dos agentes com descrições precisas
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
  { name: "Orientus", desc: "Orientações ao paciente e instruções de alta hospitalar" }
];

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
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

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Login necessário",
          description: "Faça login para assinar o plano Pro.",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          couponCode: couponApplied ? couponCode.trim() : undefined,
          billingPeriod,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
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

  const freeFeatures = [
    { text: "Examinus ilimitado: extração e formatação inteligente de exames laboratoriais e de imagem" },
    { text: "Aceita PDFs, fotos, textos confusos — qualquer formato de entrada" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-20">
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <Badge className="mb-3 md:mb-4 text-xs md:text-sm bg-primary/10 text-primary hover:bg-primary/20">
            Oferta de Lançamento
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 lg:mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent px-4">
            Planos que cabem no seu bolso
          </h1>
          <p className="text-sm md:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 md:mb-6 lg:mb-8 px-4">
            Examinus grátis para sempre. Pro desbloqueia 10 assistentes especializados.
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-4xl mx-auto mb-6 md:mb-8">
          <Card className="p-4 md:p-6 lg:p-8 border-2">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
              <div className="flex-1">
                <Badge className="mb-2 text-xs md:text-sm bg-green-500/10 text-green-600 border-green-500/20">
                  Grátis para sempre
                </Badge>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 md:mb-2">Examinus Free</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                  Organização inteligente de exames médicos
                </p>
                <div className="space-y-2 md:space-y-3">
                  {freeFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs md:text-sm">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-2 md:gap-3">
                <div className="text-center md:text-right">
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold">R$ 0</div>
                  <div className="text-xs md:text-sm text-muted-foreground">/sempre</div>
                </div>
                <Button variant="outline" size="lg" onClick={() => navigate('/auth')} className="w-full md:w-auto h-11 md:h-12 text-sm md:text-base">
                  Criar Conta Grátis
                </Button>
                <p className="text-[10px] md:text-xs text-muted-foreground text-center">
                  Sem cartão • Sem compromisso
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pro Plan Card */}
        <Card className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 lg:p-12 border-2 border-primary relative overflow-hidden shadow-[0_20px_70px_-15px_rgba(168,85,247,0.4)]">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 opacity-50 pointer-events-none"></div>
          
          {/* Badge */}
          <div className="absolute -top-1 -right-1 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary blur-lg opacity-70 animate-pulse"></div>
              <Badge className="relative bg-gradient-primary text-primary-foreground border-0 px-4 py-1.5 text-xs font-bold shadow-lg">
                RECOMENDADO
              </Badge>
            </div>
          </div>
          
          <div className="text-center mb-4 md:mb-6 lg:mb-8 relative z-10">
            <Badge className="mb-2 md:mb-3 text-xs md:text-sm bg-gradient-primary text-primary-foreground border-0 shadow-lg">
              Plano Pro
            </Badge>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent px-4">
              MedStation AI Pro
            </h2>

            {/* Billing Period Toggle */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  billingPeriod === "yearly"
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Anual
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  -17%
                </span>
              </button>
            </div>

            {/* Pricing display */}
            <div className="flex flex-col items-center gap-2 my-4 md:my-6 lg:my-8">
              <div className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full mb-2 md:mb-3">
                <span className="text-[10px] md:text-xs font-bold text-green-600 dark:text-green-400">OFERTA DE LANÇAMENTO</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1 md:mb-2">
                  <span className="text-sm md:text-lg text-muted-foreground line-through">
                    {billingPeriod === "monthly" ? "R$ 59,90" : "R$ 239,90"}
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-1 md:mb-2">
                  <span className="text-4xl md:text-5xl lg:text-7xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {billingPeriod === "monthly" ? "R$ 19,90" : "R$ 199,90"}
                  </span>
                </div>
                <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
                  {billingPeriod === "monthly" ? "/mês" : "/ano"}
                </p>
                {billingPeriod === "yearly" && (
                  <p className="text-[10px] md:text-xs lg:text-sm text-green-600 dark:text-green-400 mt-1 md:mt-2 font-medium">
                    Equivale a R$ 16,66/mês — economize 2 meses!
                  </p>
                )}
                {billingPeriod === "monthly" && (
                  <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground mt-1 md:mt-2">
                    ou R$ 199,90/ano — economize 2 meses
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg px-4">
              Acesso completo aos 10 assistentes IA especializados
            </p>
          </div>

          {/* Lista dos 10 assistentes */}
          <div className="relative mb-6 md:mb-8 z-10">
            <h3 className="font-semibold text-sm md:text-lg mb-3 md:mb-4 text-center">10 Assistentes Especializados:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              {proAgents.map((agent, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-1.5 md:mt-2 flex-shrink-0"></div>
                  <span className="text-xs md:text-sm">
                    <strong className="text-foreground">{agent.name}:</strong> <span className="text-muted-foreground">{agent.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Garantia de 7 dias - Destaque */}
          <div className="mt-4 md:mt-6 lg:mt-8 p-3 md:p-4 lg:p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl md:rounded-2xl relative overflow-hidden z-10">
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row items-center gap-2 md:gap-3 lg:gap-4 text-center sm:text-left">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm md:text-base lg:text-xl text-foreground mb-1 md:mb-1.5 lg:mb-2">Garantia de 7 Dias</h3>
                <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground leading-relaxed">
                  Teste o MedStation AI Pro por 7 dias. Se não gostar, devolvemos 100% do valor. 
                  <span className="font-semibold text-foreground"> Sem perguntas.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="mt-4 md:mt-6 space-y-3 relative z-10">
            {!showCoupon ? (
              <button
                type="button"
                onClick={() => setShowCoupon(true)}
                className="text-xs md:text-sm text-primary hover:underline font-medium"
              >
                Tem um cupom de desconto?
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="Digite o código do cupom"
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
                  <div className="flex items-center gap-2 text-xs md:text-sm text-green-600 dark:text-green-400">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Cupom aplicado com sucesso
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full mt-4 md:mt-6 h-12 md:h-14 text-sm md:text-base lg:text-lg relative z-10"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Processando..." : "Assinar agora"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <div className="text-center mt-4 md:mt-6 space-y-1.5 md:space-y-2 relative z-10">
            <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Garantia de reembolso total em 7 dias
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Cancele quando quiser • Sem taxas ocultas • Sem multa
            </p>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto mt-8 md:mt-12 lg:mt-16 grid grid-cols-3 gap-3 md:gap-6 lg:gap-8 text-center px-2">
          <div>
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary mb-0.5 md:mb-2">99.9%</div>
            <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Uptime</div>
          </div>
          <div>
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary mb-0.5 md:mb-2">LGPD</div>
            <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Compliance</div>
          </div>
          <div>
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-primary mb-0.5 md:mb-2">24/7</div>
            <div className="text-[10px] md:text-xs lg:text-sm text-muted-foreground">Disponível</div>
          </div>
        </div>
      </div>
    </div>
  );
}
