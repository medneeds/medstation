import { ReactNode, useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PremiumAgentGuardProps {
  children: ReactNode;
  agentName: string;
}

export function PremiumAgentGuard({ children, agentName }: PremiumAgentGuardProps) {
  const { subscribed, hasAgents, loading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
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
        body: { billingPeriod: "monthly", product: "agents" },
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
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }

  if (!subscribed || !hasAgents) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Assistente Premium</CardTitle>
            <CardDescription className="text-base mt-2">
              O assistente {agentName} está disponível apenas para assinantes do plano Pro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Com o plano Pro você tem:</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Acesso completo a todos os 10 assistentes de IA especializados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Pacientes e casos ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Análises avançadas e exportação de relatórios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Upload de documentos e transcrição de áudio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Garantia de 7 dias ou seu dinheiro de volta</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full mb-3">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">67% OFF</span>
                </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-lg text-muted-foreground line-through">R$ 59,90</span>
                  <span className="text-4xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">R$ 29,90</span>
                </div>
                <span className="text-muted-foreground">/mês</span>
                <p className="text-xs text-muted-foreground mt-1">
                  ou R$ 199,90/ano — economize 2 meses
                </p>
              </div>
              <Button 
                size="lg" 
                className="w-full mb-3" 
                onClick={handleSubscribe}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Assinar Agora"
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/pricing")}>
                Ver Detalhes do Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
