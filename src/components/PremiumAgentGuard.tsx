import { ReactNode, useEffect, useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PremiumAgentGuardProps {
  children: ReactNode;
  agentName: string;
}

export function PremiumAgentGuard({ children, agentName }: PremiumAgentGuardProps) {
  const { subscribed, loading } = useSubscription();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();
          
          if (!error && data) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, []);

  if (loading || checkingAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }

  if (!subscribed && !isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Agente Premium</CardTitle>
            <CardDescription className="text-base mt-2">
              O agente {agentName} está disponível apenas para assinantes do plano Pro
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
                  <span>Acesso completo a todos os 6 agentes de IA especializados</span>
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
              </ul>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <span className="text-3xl font-bold">R$ 49</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <Button size="lg" className="w-full mb-3" onClick={() => navigate("/pricing")}>
                Assinar Agora
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
