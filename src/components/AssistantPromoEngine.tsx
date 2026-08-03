import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeModal } from "@/components/demo/UpgradeModal";
import {
  ASSISTANT_PROMOS,
  PRODUCTIVITY_PROMOS,
  OFFER_PROMOS,
  pickRandom,
  type PromoItem,
} from "@/lib/demoPromoContent";

const FIRST_DELAY_MS = 3 * 60_000;   // primeiro pop após 3 min de uso
const INTERVAL_MS = 7 * 60_000;      // depois, a cada 7 min
const MODAL_EVERY = 4;               // a cada 4 pops, mostra o modal completo
const SHOWN_KEY = "ms_app_promo_shown";

/**
 * Pop-ups periódicos, no ambiente pós-login, mostrando as vantagens dos
 * demais assistentes. Só para usuários sem assinatura ativa.
 */
export function AssistantPromoEngine() {
  const { subscribed, loading } = useSubscription();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const countRef = useRef(0);
  const recentRef = useRef<string[]>([]);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const active = !loading && !subscribed;

  useEffect(() => {
    if (!active) return;

    const pools = [ASSISTANT_PROMOS, PRODUCTIVITY_PROMOS, OFFER_PROMOS];

    const show = () => {
      // não interrompe em telas de compra/checkout
      if (/^\/(pricing|welcome|welcome-tour|onboarding)/.test(pathRef.current)) return;
      if (document.hidden) return;

      countRef.current += 1;
      if (countRef.current % MODAL_EVERY === 0) {
        setModalOpen(true);
        return;
      }

      const pool = pools[countRef.current % pools.length];
      const promo: PromoItem | null = pickRandom(pool, recentRef.current);
      if (!promo) return;
      recentRef.current = [promo.id, ...recentRef.current].slice(0, 8);
      try {
        sessionStorage.setItem(SHOWN_KEY, String(countRef.current));
      } catch {}

      toast(promo.title, {
        description: promo.description,
        duration: 8000,
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        action: {
          label: promo.cta || "Ver planos",
          onClick: () => navigate("/pricing"),
        },
      });
    };

    const first = window.setTimeout(() => {
      show();
      const id = window.setInterval(show, INTERVAL_MS);
      intervalRef.current = id;
    }, FIRST_DELAY_MS);

    const intervalRef = { current: 0 as number };

    return () => {
      window.clearTimeout(first);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [active, navigate]);

  if (!active) return null;

  return <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} reason="engagement" />;
}
