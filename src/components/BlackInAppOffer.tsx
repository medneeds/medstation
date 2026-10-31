import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BLACK_OFFER, blackStatus } from "@/lib/pricingSchedule";
import { trackCtaClick } from "@/lib/analytics";

const DISMISS_KEY = "ms:black-inapp-dismissed-until";
const DISMISS_DAYS = 3;

function dismissedNow(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

/**
 * Aviso da Black dentro da plataforma (novembro), para quem ainda não tem o anual.
 * Assinante mensal vê a troca sem cobrança dupla; quem está no teste ou com
 * acesso vencido vê o preço do ano. Fechado, some por 3 dias e volta o `fallback`.
 */
export function BlackInAppOffer({ fallback }: { fallback?: ReactNode }) {
  const { isAnnual, accessStatus, isTrial, loading } = useSubscription();
  const [hidden, setHidden] = useState(dismissedNow);

  const show = !loading && !hidden && !isAnnual && blackStatus() === "active";
  if (!show) return <>{fallback}</>;

  const monthly = accessStatus === "paid_active" || accessStatus === "past_due";
  const title = monthly
    ? "Troque o mensal pelo anual Black: 12 meses por R$ 399,90"
    : "Black MedStation: 12 meses por R$ 399,90";
  const body = monthly
    ? "Seu mensal é encerrado sozinho no fim do mês já pago, sem cobrança dupla. Só até 30/11."
    : isTrial
      ? "Garanta o ano inteiro antes do fim do seu teste. Cartão em até 12x ou boleto. Só até 30/11."
      : "Volte a usar a MedStation o ano inteiro. Cartão em até 12x ou boleto. Só até 30/11.";

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    } catch {
      // sem armazenamento: só esconde nesta tela
    }
    setHidden(true);
  };

  return (
    <div className="dark mb-4 flex flex-col gap-3 rounded-xl border border-offer-gold/40 bg-offer px-4 py-3 text-offer-foreground sm:flex-row sm:items-center">
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
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar aviso da Black"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-offer-muted hover:text-offer-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
