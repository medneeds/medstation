import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Shield, Users, BarChart3, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

      const { data, error } = await supabase.functions.invoke("create-checkout");
      
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

  const features = [
    { icon: Sparkles, text: "5 Assistentes Premium de IA", description: "Clínicus, Scorius, Numerus, Prescriptus e CODexus" },
    { icon: Users, text: "Pacientes Ilimitados", description: "Gerencie quantos pacientes precisar" },
    { icon: FileText, text: "Casos Ilimitados", description: "Sem limite de casos clínicos" },
    { icon: BarChart3, text: "Análise Avançada", description: "Dashboards e métricas detalhadas" },
    { icon: Shield, text: "Dados Seguros", description: "Criptografia de ponta a ponta" },
    { icon: Zap, text: "Performance Rápida", description: "Respostas instantâneas dos assistentes" },
  ];

  const freeFeatures = [
    { text: "Assistente Examinus (Análise de Exames)" },
    { text: "Gestão básica de pacientes" },
    { text: "Até 10 casos clínicos" },
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <Badge className="mb-2 bg-green-500/10 text-green-600 border-green-500/20">
                  Plano Gratuito
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Comece Grátis</h2>
                <p className="text-muted-foreground mb-4">
                  Experimente o poder da IA médica com acesso ao Examinus
                </p>
                <div className="space-y-2">
                  {freeFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="text-3xl md:text-4xl font-bold">R$ 0</div>
                <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="w-full md:w-auto">
                  Criar Conta Grátis
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Pro Plan Card */}
        <Card className="max-w-4xl mx-auto p-6 md:p-12 border-2 border-primary relative overflow-hidden shadow-[0_20px_70px_-15px_rgba(168,85,247,0.4)]">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 opacity-50"></div>
          
          <div className="text-center mb-6 md:mb-8 relative">
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
            
            {/* Pricing display */}
            <div className="flex flex-col items-center gap-2 my-6">
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
            </div>
            
            <p className="text-muted-foreground text-lg">
              Acesso completo a todos os assistentes e recursos premium
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.text}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t">
            <h3 className="font-semibold mb-4 text-center">Também incluso:</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                "Exportação de relatórios em PDF",
                "Busca inteligente por casos",
                "Sistema de tags e categorização",
                "Upload de arquivos e evidências",
                "Transcrição de áudio",
                "Chat com IA contextual por caso",
                "Suporte prioritário",
                "Atualizações automáticas",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full mt-8 h-14 text-lg"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? "Processando..." : "Assinar Agora"}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Cancele a qualquer momento. Sem taxas ocultas.
          </p>
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
