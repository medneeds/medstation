import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);
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
    setShowComingSoonDialog(true);
  };

  const proAgents = [
    { name: "Examinus", desc: "Interpretação de exames" },
    { name: "Clínicus", desc: "Anamneses estruturadas" },
    { name: "Scorius", desc: "Cálculo de scores clínicos" },
    { name: "Prescriptus", desc: "Prescrições baseadas em evidências" },
    { name: "Numerus", desc: "Calculadoras médicas" },
    { name: "CODexus", desc: "Codificação CID-10 e TISS" },
    { name: "Gasometrus", desc: "Análise de gasometria arterial" },
    { name: "Atestus", desc: "Geração de atestados médicos" },
    { name: "Protocolus", desc: "Protocolos clínicos e guidelines" },
    { name: "Orientus", desc: "Orientações ao paciente e alta" }
  ];

  const freeFeatures = [
    { text: "Organização e estruturação inteligente de qualquer resultado de exame laboratorial (hemograma, bioquímica, gasometria) e de imagem (tomografia, raio-X, ultrassom)" },
    { text: "Uso ilimitado dentro da plataforma (cadastro gratuito)" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-20">
        <div className="text-center mb-8 md:mb-12 lg:mb-16">
          <Badge className="mb-3 md:mb-4 text-xs md:text-sm bg-primary/10 text-primary hover:bg-primary/20">
            Oferta Especial de Lançamento
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 lg:mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent px-4">
            Escolha seu Plano
          </h1>
          <p className="text-sm md:text-base lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 md:mb-6 lg:mb-8 px-4">
            Comece grátis com Examinus ou desbloqueie todos os assistentes com o plano Pro
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-4xl mx-auto mb-6 md:mb-8">
          <Card className="p-4 md:p-6 lg:p-8 border-2">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
              <div className="flex-1">
                <Badge className="mb-2 text-xs md:text-sm bg-green-500/10 text-green-600 border-green-500/20">
                  Plano Gratuito
                </Badge>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1.5 md:mb-2">Examinus Grátis</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                  Experimente o poder da IA médica para organização de exames
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
                <Button variant="outline" size="lg" onClick={() => setShowComingSoonDialog(true)} className="w-full md:w-auto h-11 md:h-12 text-sm md:text-base">
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
        <Card className="max-w-4xl mx-auto p-4 md:p-8 lg:p-12 border-2 border-primary relative overflow-hidden shadow-[0_20px_70px_-15px_rgba(168,85,247,0.4)]">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 opacity-50 pointer-events-none"></div>
          
          <div className="text-center mb-4 md:mb-6 lg:mb-8 relative z-10">
            <Badge className="mb-2 md:mb-3 text-xs md:text-sm bg-gradient-primary text-primary-foreground border-0 shadow-lg">
              Plano Pro
            </Badge>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent px-4">
              MedStation AI Pro
            </h2>

            {/* Pricing display with "Em breve" overlay */}
            <div className="flex flex-col items-center gap-2 my-6 md:my-8 relative min-h-[180px] md:min-h-[200px]">
              {/* Preço original (coberto pela tarja) */}
              <div className="relative z-10 text-center">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    R$ 19,90
                  </span>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  /mês
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">
                  ou R$ 199,90/ano (16% de desconto)
                </p>
              </div>

              {/* Tarja "Em breve" sobreposta - ENHANCED */}
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-br from-background/99 via-background/98 to-background/97 backdrop-blur-3xl rounded-2xl border-2 border-primary/30">
                <div className="relative group cursor-pointer">
                  {/* Glow on hover only */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700"></div>
                  
                  {/* Decorative sparkles - subtle */}
                  <div className="absolute -top-4 -left-4 w-1.5 h-1.5 bg-primary/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity"></div>
                  <div className="absolute -bottom-4 -right-4 w-1.5 h-1.5 bg-purple-500/60 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" style={{ animationDelay: '0.3s' }}></div>
                  
                  {/* Main badge with enhanced styling */}
                  <div className="relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 px-8 py-4 md:px-14 md:py-7 rounded-2xl border-2 border-primary-foreground/30 shadow-[0_0_60px_-10px_rgba(168,85,247,0.7)] rotate-[-3deg] group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-out">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 rounded-2xl"></div>
                    
                    {/* Text with enhanced effects */}
                    <div className="relative flex flex-col items-center gap-1">
                      <span className="text-3xl md:text-5xl lg:text-6xl font-black text-primary-foreground tracking-wider drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                        EM BREVE!
                      </span>
                      <div className="flex items-center gap-1.5 text-primary-foreground/90 text-xs md:text-sm font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80"></div>
                        <span>Aguarde o lançamento</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-lg">
              Acesso completo a todos os assistentes e recursos premium
            </p>
          </div>
          {/* Lista dos 6 assistentes */}
          <div className="relative mb-8 z-10">
            <h3 className="font-semibold text-lg mb-4 text-center">9 Assistentes Especializados:</h3>
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
          <div className="mt-6 md:mt-8 p-4 md:p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl relative overflow-hidden z-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
            <div className="relative flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
              <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base md:text-lg lg:text-xl text-foreground mb-1.5 md:mb-2">Garantia Incondicional de 7 Dias</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Experimente o MedStation AI Pro por 7 dias. Se não ficar completamente satisfeito, devolvemos 100% do seu investimento. 
                  <span className="font-semibold text-foreground"> Sem perguntas. Sem burocracia.</span>
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
            className="w-full mt-4 md:mt-6 h-12 md:h-14 text-sm md:text-base lg:text-lg relative z-10"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Processando..." : "Começar agora - Sem riscos"}
          </Button>

          <div className="text-center mt-4 md:mt-6 space-y-1.5 md:space-y-2 relative z-10">
            <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Garantia de reembolso total em 7 dias
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Cancele a qualquer momento • Sem taxas ocultas
            </p>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="max-w-4xl mx-auto mt-10 md:mt-12 lg:mt-16 grid grid-cols-3 gap-4 md:gap-6 lg:gap-8 text-center">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">99.9%</div>
            <div className="text-xs md:text-sm text-muted-foreground">Uptime</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">LGPD</div>
            <div className="text-xs md:text-sm text-muted-foreground">Compliance</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1 md:mb-2">24/7</div>
            <div className="text-xs md:text-sm text-muted-foreground">Disponível</div>
          </div>
        </div>
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Assinatura em Breve! 🚀
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-4">
              <p className="text-foreground/90">
                A assinatura da plataforma MedStation AI estará disponível em breve!
              </p>
              <p className="text-foreground/90">
                Seja um dos primeiros a ter acesso exclusivo falando diretamente com{" "}
                <span className="font-semibold text-primary">Artur Batista</span>, 
                médico desenvolvedor da plataforma.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open("https://w.app/medstationai", "_blank")}
              className="w-full h-12 text-base font-semibold"
            >
              💬 Falar com Artur no WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowComingSoonDialog(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
