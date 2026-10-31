import { Link } from "react-router-dom";
import { trackCtaClick } from "@/lib/analytics";
import { BLACK_OFFER, isBlackActive } from "@/lib/pricingSchedule";
import { brl } from "@/lib/subscription-tiers";

/**
 * Faixa da Black MedStation no topo da landing, só durante novembro/2026.
 * A cópia estática em index.html usa as mesmas classes: ao mudar aqui, atualize lá.
 */
export function BlackFridayBanner() {
  if (!isBlackActive()) return null;
  return (
    <Link
      to="/black"
      onClick={() => trackCtaClick({ cta: "banner_black", section: "lp3", destination: "/black" })}
      className="block bg-offer text-offer-foreground border-b border-offer-border hover:bg-offer/95"
    >
      <div className="container mx-auto px-4 md:px-8 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs md:text-sm text-center">
        <span className="font-mono uppercase tracking-[0.18em] text-offer-accent text-[0.65rem] md:text-xs">
          Black MedStation
        </span>
        <span>
          Plano anual de <span className="line-through text-offer-muted">{brl(BLACK_OFFER.anchorCents / 100)}</span> por{" "}
          <strong className="font-semibold">{brl(BLACK_OFFER.amountCents / 100)}</strong> · só até 30/11
        </span>
        <span className="font-medium underline underline-offset-2">Ver oferta</span>
      </div>
    </Link>
  );
}
