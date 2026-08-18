import { Link } from "react-router-dom";
import { Sparkles, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { brl, DISPLAY_PRICING } from "@/lib/subscription-tiers";
import { cn } from "@/lib/utils";

/**
 * Faixa de contagem regressiva do acesso completo temporário.
 * Aparece apenas durante o período de teste (cadastro novo ou liberação estendida).
 */
export function TrialCountdownBanner() {
  const { isTrial, trialSource, subscriptionEnd, loading } = useSubscription();
  if (loading || !isTrial || !subscriptionEnd) return null;

  const msLeft = new Date(subscriptionEnd).getTime() - Date.now();
  if (Number.isNaN(msLeft) || msLeft <= 0) return null;

  const daysLeft = Math.max(1, Math.ceil(msLeft / 86400000));
  const urgent = daysLeft <= 2;
  const price = DISPLAY_PRICING.bundle.monthly;

  const timeLabel = daysLeft === 1 ? "último dia" : `${daysLeft} dias`;

  return (
    <div
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3",
        urgent
          ? "border-destructive/40 bg-destructive/5"
          : "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
            urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {trialSource === "legacy"
              ? `Liberamos a plataforma inteira para você — ${timeLabel} restante${daysLeft === 1 ? "" : "s"}`
              : `Seu acesso completo termina em ${timeLabel}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            12 assistentes, Modo Escuta e Modo Rotineiro liberados. Assine por {brl(price.now)} por mês e
            mantenha esse valor por pelo menos 12 meses.
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant={urgent ? "destructive" : "default"} className="shrink-0">
        <Link to="/pricing">
          <Crown className="mr-1.5 h-3.5 w-3.5" />
          Garantir {brl(price.now)}/mês
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
