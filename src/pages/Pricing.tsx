import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Login necessário",
          description: "Você precisa fazer login para assinar.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          couponCode: couponCode.trim() || undefined,
          billingPeriod 
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o processo de assinatura.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const proAgents = [
    { name: "Examinus", desc: "Interpretação de exames" },
    { name: "Clínicus", desc: "Anamneses estruturadas" },
    { name: "Scorius", desc: "Cálculo de scores clínicos" },
    { name: "Prescriptus", desc: "Prescrições baseadas em evidências" },
    { name: "Numerus", desc: "Calculadoras médicas" },
    { name: "CODexus", desc: "Codificação CID-10 e TISS" }
  ];

  const freeFeatures = [
    { text: "Organização e estruturação inteligente de qualquer resultado de exame laboratorial (hemograma, bioquímica, gasometria) e de imagem (tomografia, raio-X, ultrassom)" },
    { text: "Uso ilimitado dentro da plataforma (cadastro gratuito)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12 md:mb-16">
          <Badge className="mb-4 text-xs md:text-sm bg-primary/10 text-primary hover:bg-primary/20">
            Oferta Especial de Lançamento
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            Escolha seu Plano
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Comece grátis com Examinus ou desbloqueie todos os assistentes com o plano Pro
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="p-6 md:p-8 border-2">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <Badge className="mb-2 bg-green-500/10 text-green-600 border-green-500/20">
                  Plano Gratuito
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Examinus Grátis</h2>
                <p className="text-muted-foreground mb-4">
                  Experimente o poder da IA médica para organização de exames
                </p>
                <div className="space-y-3">
                  {freeFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-3">
                <div className="text-center md:text-right">
                  <div className="text-4xl md:text-5xl font-bold">R$ 0</div>
                  <div className="text-muted-foreground">/sempre</div>
                </div>
                <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full md:w-auto">
                  Criar Conta Grátis
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Sem cartão • Sem compromisso
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pro Plan Card */}
        <Card className="max-w-4xl mx-auto p-6 md:p-12 border-2 border-primary relative overflow-hidden shadow-[0_20px_70px_-15px_rgba(168,85,247,0.4)]">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 opacity-50 pointer-events-none"></div>
          
          <div className="text-center mb-6 md:mb-8 relative z-10">
            {/* Discount badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full mb-4">
              <span className="text-sm font-bold text-green-600 dark:text-green-400">🎉 67% DE DESCONTO</span>
            </div>
            
            <Badge className="mb-3 bg-gradient-primary text-primary-foreground border-0 shadow-lg">
              Plano Pro
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              MedStation AI Pro
            </h2>
            
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 p-1 bg-muted/50 rounded-lg border border-border/50">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    billingPeriod === "monthly"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                    billingPeriod === "yearly"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Anual
                  <span className="ml-2 text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                    -16%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing display */}
            <div className="flex flex-col items-center gap-2 my-6">
              {billingPeriod === "monthly" ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-muted-foreground line-through decoration-2">R$ 59,90</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">R$ 19,90</span>
                      <span className="text-2xl text-muted-foreground font-medium">/mês</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg border border-border/50 mt-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">
                      Ou <span className="font-bold text-foreground">R$ 199,90/ano</span> • Economize R$ 38,90
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-muted-foreground line-through decoration-2">R$ 238,80</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">R$ 199,90</span>
                      <span className="text-2xl text-muted-foreground font-medium">/ano</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/30 mt-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Economize R$ 38,90 por ano • Apenas R$ 16,66/mês
                    </span>
                  </div>
                </>
              )}
            </div>
            
            <p className="text-muted-foreground text-lg">
              Acesso completo a todos os assistentes e recursos premium
            </p>
          </div>
          {/* Lista dos 6 assistentes */}
          <div className="relative mb-8 z-10">
            <h3 className="font-semibold text-lg mb-4 text-center">6 Assistentes Especializados:</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {proAgents.map((agent, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-sm">
                    <strong className="text-foreground">{agent.name}:</strong> {agent.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Garantia de 7 dias - Destaque */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl relative overflow-hidden z-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-foreground mb-2">Garantia Incondicional de 7 Dias</h3>
                <p className="text-muted-foreground">
                  Experimente o MedStation AI Pro por 7 dias. Se não ficar completamente satisfeito, devolvemos 100% do seu investimento. 
                  <span className="font-semibold text-foreground"> Sem perguntas. Sem burocracia. Sem riscos.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Coupon Section */}
          <div className="mt-6 space-y-3 relative z-10">
            {!showCoupon ? (
              <button
                type="button"
                onClick={() => setShowCoupon(true)}
                className="text-sm text-primary hover:underline font-medium"
              >
                Tem um cupom de desconto?
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Digite o código do cupom"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponApplied(false);
                    }}
                    className="flex-1"
                    disabled={couponApplied}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponApplied}
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
                  >
                    Cancelar
                  </Button>
                </div>
                {couponApplied && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-full mt-6 h-14 text-lg relative z-10"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Processando..." : "Começar agora - Sem riscos"}
          </Button>

          <div className="text-center mt-6 space-y-2 relative z-10">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Garantia de reembolso total em 7 dias
            </p>
            <p className="text-xs text-muted-foreground">
              Cancele a qualquer momento • Sem taxas ocultas • Sem compromisso
            </p>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">LGPD</div>
            <div className="text-sm text-muted-foreground">Compliance</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">Disponível</div>
          </div>
        </div>
      </div>
    </div>
  );
}
