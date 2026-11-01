import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, type AccessStatus } from "@/contexts/SubscriptionContext";
import { BLACK_OFFER, blackStatus } from "@/lib/pricingSchedule";
import { trackCtaClick } from "@/lib/analytics";

/**
 * Quem vê a Black dentro da plataforma em novembro: teste ativo, teste vencido
 * sem assinatura, mensal (inclusive com pagamento pendente) e cortesia. Só o
 * anual não vê. Admin e erro de verificação também não.
 */
export function shouldShowBlackInApp(input: {
  isAnnual: boolean;
  accessStatus: AccessStatus;
  loading?: boolean;
  status?: ReturnType<typeof blackStatus>;
}): boolean {
  if (input.loading || input.isAnnual) return false;
  if ((input.status ?? blackStatus()) !== "active") return false;
  return input.accessStatus !== "admin" && input.accessStatus !== "verification_error";
}

/**
 * Aviso da Black dentro da plataforma (novembro), para quem ainda não tem o anual.
 * Assinante mensal vê a troca sem cobrança dupla; quem está no teste ou com
 * acesso vencido vê o preço do ano. Fica fixo durante a oferta (sem fechar).
 */
export function BlackInAppOffer({ fallback }: { fallback?: ReactNode }) {
  const { isAnnual, accessStatus, isTrial, loading } = useSubscription();
  if (!shouldShowBlackInApp({ isAnnual, accessStatus, loading })) return <>{fallback}</>;

  const monthly = accessStatus === "paid_active" || accessStatus === "past_due";
  const title = monthly
    ? "Troque o mensal pelo anual Black: 12 meses por R$ 399,90"
    : "Black MedStation: 12 meses por R$ 399,90";
  const body = monthly
    ? "Seu mensal é encerrado sozinho no fim do mês já pago, sem cobrança dupla. Só até 30/11."
    : isTrial
      ? "Garanta o ano inteiro antes do fim do seu teste. Pagamento único no cartão. Só até 30/11."
      : "Volte a usar a MedStation o ano inteiro. Pagamento único no cartão. Só até 30/11.";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-offer-gold/40 bg-offer px-4 py-3 text-offer-foreground sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-offer-gold/15 text-offer-gold">
          <Flame className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-offer-muted">{body}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="h-9 gap-1.5 bg-offer-gold text-offer-gold-foreground hover:bg-offer-gold/90"
          onClick={() => trackCtaClick({ cta: monthly ? "black_inapp_switch" : "black_inapp", section: "dashboard", destination: "/black" })}
        >
          <Link to={`/black?utm_source=app&utm_campaign=${BLACK_OFFER.slug}`}>
            {monthly ? "Trocar pelo anual" : "Ver a Black"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
