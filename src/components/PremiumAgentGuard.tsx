import { ReactNode, useState } from "react";
import { trackCheckoutStarted } from "@/lib/analytics";
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

      trackCheckoutStarted({
        origin: "agent_guard",
        plan: "agents_monthly",
        product: "agents",
        billing_period: "monthly",
        auth_state: "authenticated",
        agent: agentName,
      });

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
              {agentName} faz parte do MedStation AI Pro. No plano grátis só o Examinus está liberado — e mesmo assim com limite de uso, espera entre mensagens e pop-ups. No Pro, os 10 assistentes ficam liberados, sem restrições.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Por que migrar para o Pro:</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Os 10 assistentes liberados — <strong className="text-foreground">sem restrições de uso</strong>, sem limite e sem espera entre mensagens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong className="text-foreground">Sem pop-ups</strong> de upgrade interrompendo seu plantão</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Pacientes e casos ilimitados, com upload de documentos e áudio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Velocidade prioritária mesmo nos horários de pico</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Garantia de 7 dias — se não gostar, devolvemos 100%</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full mb-3">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] font-mono text-primary">Oferta especial</span>
                </div>
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-4xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">R$ 29,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ou R$ 299,90/ano (em vez de R$ 358,80) — economize R$ 58,90 (16%)
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
