import { ReactNode, useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PremiumAgentGuardProps {
  children: ReactNode;
  agentName: string;
}

export function PremiumAgentGuard({ children, agentName }: PremiumAgentGuardProps) {
  const { subscribed, loading } = useSubscription();
  const navigate = useNavigate();
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }

  if (!subscribed) {
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
                  <span>Acesso completo a todos os 6 assistentes de IA especializados</span>
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
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full mb-3">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">67% OFF</span>
                </div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-lg text-muted-foreground line-through">R$ 59,90</span>
                  <span className="text-4xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">R$ 19,90</span>
                </div>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <Button size="lg" className="w-full mb-3" onClick={() => setShowComingSoonDialog(true)}>
                Assinar Agora
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

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

  return <>{children}</>;
}
