import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Lock, 
  Zap, 
  ArrowRight,
  Brain,
  MessageSquare,
  Target
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { STUDIUS_LIMITS } from "@/lib/subscription-tiers";

interface StudiusUpgradePromptProps {
  type: "flashcards" | "quizzes" | "chatMessages";
  used: number;
  onClose?: () => void;
}

const typeConfig = {
  flashcards: {
    icon: Brain,
    label: "flashcards",
    title: "Limite de Flashcards",
    description: "Desbloqueie flashcards ilimitados para acelerar seu aprendizado.",
  },
  quizzes: {
    icon: Target,
    label: "quizzes",
    title: "Limite de Quizzes",
    description: "Pratique com quizzes ilimitados e domine qualquer tema.",
  },
  chatMessages: {
    icon: MessageSquare,
    label: "mensagens",
    title: "Limite de Mensagens",
    description: "Tire dúvidas ilimitadas com o assistente de IA.",
  },
};

export function StudiusUpgradePrompt({ type, used, onClose }: StudiusUpgradePromptProps) {
  const navigate = useNavigate();
  const { hasAgents } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const config = typeConfig[type];
  const limit = STUDIUS_LIMITS.FREE[type];
  const progress = Math.min(100, (used / limit) * 100);
  const price = hasAgents ? 9.90 : 19.90;
  const product = hasAgents ? "studius_addon" : "studius";

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth?redirect=/studius/landing");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { product },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {used} de {limit} {config.label} usados
            </span>
            <span className="font-medium text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {config.description}
        </p>

        {hasAgents && (
          <Badge className="w-full justify-center bg-green-500/20 text-green-400 border-green-500/30">
            <Zap className="h-3 w-3 mr-1" />
            50% de desconto para você!
          </Badge>
        )}

        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="text-3xl font-bold text-primary">
              R$ {price.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-muted-foreground">/mês</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleUpgrade} disabled={isLoading} className="w-full">
            {isLoading ? (
              "Processando..."
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade para Premium
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/studius/landing")}>
            Saiba mais <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StudiusUpgradeBannerProps {
  type: "flashcards" | "quizzes" | "chatMessages";
  used: number;
  className?: string;
}

export function StudiusUpgradeBanner({ type, used, className }: StudiusUpgradeBannerProps) {
  const navigate = useNavigate();
  const { hasAgents } = useSubscription();

  const config = typeConfig[type];
  const limit = STUDIUS_LIMITS.FREE[type];
  const remaining = Math.max(0, limit - used);
  const price = hasAgents ? 9.90 : 19.90;

  if (remaining > 2) return null;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 ${className}`}>
      <div className="flex items-center gap-2">
        <config.icon className="h-4 w-4 text-amber-500" />
        <span className="text-sm">
          {remaining === 0 
            ? `Limite de ${config.label} atingido!` 
            : `Apenas ${remaining} ${config.label} restantes`}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={() => navigate("/studius/landing")}>
        Upgrade R$ {price.toFixed(2).replace(".", ",")}
      </Button>
    </div>
  );
}
