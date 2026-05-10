import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PromoItem } from "@/lib/demoPromoContent";

interface PromoBannerProps {
  promo: PromoItem;
  onDismiss?: () => void;
  onOpenUpgrade?: () => void;
}

export function PromoBanner({ promo, onDismiss, onOpenUpgrade }: PromoBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleCta = () => {
    if (onOpenUpgrade) onOpenUpgrade();
    else navigate("/auth");
  };

  return (
    <div className="mt-3 mx-2 md:mx-0 p-3 md:p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pr-5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{promo.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
          </div>
        </div>
        <Button
          onClick={handleCta}
          size="sm"
          className="shrink-0 bg-gradient-primary hover:opacity-90"
        >
          {promo.cta || "Saber mais"}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
