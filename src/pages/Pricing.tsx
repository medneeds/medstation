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
    { icon: Sparkles, text: "6 Agentes de IA Especializados", description: "Clínicus, Examinus, Scorius, Numerus, Prescriptus e CODexus" },
    { icon: Users, text: "Pacientes Ilimitados", description: "Gerencie quantos pacientes precisar" },
    { icon: FileText, text: "Casos Ilimitados", description: "Sem limite de casos clínicos" },
    { icon: BarChart3, text: "Análise Avançada", description: "Dashboards e métricas detalhadas" },
    { icon: Shield, text: "Dados Seguros", description: "Criptografia de ponta a ponta" },
    { icon: Zap, text: "Performance Rápida", description: "Respostas instantâneas dos agentes" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">
            Oferta Especial de Lançamento
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            VitaStation Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A plataforma completa de assistência médica com IA que revoluciona seu atendimento
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-8">
            <span className="text-5xl font-bold">R$ 99</span>
            <span className="text-2xl text-muted-foreground">/mês</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="max-w-4xl mx-auto p-8 md:p-12 border-2 border-primary/20 shadow-2xl">
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
