import { ReactNode, useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PremiumConsultorioGuardProps {
  children: ReactNode;
}

export function PremiumConsultorioGuard({ children }: PremiumConsultorioGuardProps) {
  const { hasConsultorio, hasAgents, loading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleSubscribe = async (plan: "consultorio_monthly" | "consultorio_upgrade" | "pro2_bundle") => {
    setCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (error: any) {
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

  if (!hasConsultorio) {
    // If user already has Agents → highlight upgrade R$ 19,90
    const isUpgradePath = hasAgents;

    return (
      <div className="h-full flex items-center justify-center p-6 overflow-y-auto">
        <Card className="max-w-2xl w-full border-2 border-primary/30 my-6">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Modo Consultório</CardTitle>
            <CardDescription className="text-base mt-2">
              Transcrição em tempo real durante a consulta + AHE estruturada automaticamente.
              Produza mais. Digite menos. Direto da consulta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">O que está incluso:</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Transcrição em tempo real, com revisão final do áudio para máxima precisão</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span><strong className="text-foreground">Anti-alucinação estrita</strong> — só transcreve o que foi dito</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Anamnese estruturada automática ao final da consulta</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Garantia de 7 dias — se não gostar, devolvemos 100%</span>
                </li>
              </ul>
            </div>

            {isUpgradePath ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full">
                  <span className="text-[0.65rem] uppercase tracking-[0.18em] font-mono text-primary">
                    Você já tem os Assistentes
                  </span>
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">R$ 29,90</span>
                  <span className="text-4xl font-black text-primary">R$ 19,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preço exclusivo de upgrade para quem já é assinante MedStation
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => handleSubscribe("consultorio_upgrade")}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    "Adicionar Modo Consultório por R$ 19,90/mês"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubscribe("consultorio_monthly")}
                    disabled={checkoutLoading}
                    className="text-left p-4 rounded-md border border-hairline hover:border-primary/40 transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">Apenas Consultório</div>
                    <div className="text-2xl font-bold text-foreground mt-1">R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubscribe("pro2_bundle")}
                    disabled={checkoutLoading}
                    className="text-left p-4 rounded-md border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50 relative"
                  >
                    <span className="absolute -top-2 right-3 text-[0.6rem] uppercase tracking-[0.18em] font-mono bg-primary text-primary-foreground px-2 py-0.5 rounded-sm">
                      Melhor valor
                    </span>
                    <div className="text-xs text-primary uppercase tracking-wider font-mono">Pro 2 (tudo incluso)</div>
                    <div className="text-2xl font-bold text-foreground mt-1">R$ 49,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">10 Assistentes + Consultório</div>
                  </button>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate("/consultorio-landing")}>
                  Saber mais sobre o Modo Consultório
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Garantia de 7 dias — sem perguntas
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
