import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Crown } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { brl, DISPLAY_PRICING } from "@/lib/subscription-tiers";

/**
 * Faixa de status do acesso: mostra o teste de 7 dias em andamento
 * ou o convite para assinar quando o teste já terminou.
 * Não aparece para assinantes pagantes.
 */
export function FreeExaminusSpotlight() {
  const { subscribed, isTrial, subscriptionEnd, loading } = useSubscription();
  if (loading) return null;
  if (subscribed && !isTrial) return null;

  const daysLeft = isTrial && subscriptionEnd
    ? Math.max(0, Math.ceil((new Date(subscriptionEnd).getTime() - Date.now()) / 86400000))
    : null;

  const price = DISPLAY_PRICING.bundle.monthly;

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {isTrial ? "Seu teste está ativo" : "Assine para continuar"}
              </h3>
              {isTrial && daysLeft !== null && (
                <Badge variant="secondary" className="text-[10px]">
                  {daysLeft === 1 ? "último dia" : `${daysLeft} dias restantes`}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {isTrial
                ? "Você está com a plataforma inteira liberada: os 12 assistentes, o Modo Escuta e o Modo Rotineiro. Sem cartão de crédito até aqui."
                : `Seu período de teste terminou. Libere tudo de novo por ${brl(price.now)} por mês — em breve o plano passa a ${brl(99.9)}.`}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button asChild>
            <Link to="/pricing">
              <Crown className="mr-1.5 h-4 w-4" />
              {isTrial ? "Garantir o valor atual" : "Assinar agora"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
