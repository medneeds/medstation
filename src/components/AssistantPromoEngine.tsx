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
  createPromoRotator,
  type PromoItem,
} from "@/lib/demoPromoContent";

const FIRST_DELAY_MS = 3 * 60_000;   // primeiro pop após 3 min de uso
const INTERVAL_MS = 7 * 60_000;      // depois, a cada 7 min
const MODAL_EVERY = 4;               // a cada 4 pops, mostra o modal completo
const COUNT_KEY = "ms_app_promo_count";
const LAST_AT_KEY = "ms_app_promo_last_at";

const readNum = (key: string) => {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};

/**
 * Pop-ups periódicos, no ambiente pós-login, mostrando as vantagens dos
 * demais assistentes. Só para usuários sem assinatura ativa.
 *
 * Rotação: cada categoria tem sua própria fila embaralhada e persistida —
 * todos os assistentes (incluindo Mediscuss) aparecem antes de qualquer
 * repetição, e nunca o mesmo dois pops seguidos.
 */
export function AssistantPromoEngine() {
  const { subscribed, loading } = useSubscription();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const active = !loading && !subscribed;

  useEffect(() => {
    if (!active) return;

    const rotators = [
      createPromoRotator(ASSISTANT_PROMOS, "ms_rot_assistants"),
      createPromoRotator(PRODUCTIVITY_PROMOS, "ms_rot_productivity"),
      createPromoRotator(OFFER_PROMOS, "ms_rot_offers"),
    ];

    const show = () => {
      // não interrompe em telas de compra/checkout
      if (/^\/(pricing|welcome|welcome-tour|onboarding)/.test(pathRef.current)) return;
      if (document.hidden) return;

      const count = readNum(COUNT_KEY) + 1;
      try {
        localStorage.setItem(COUNT_KEY, String(count));
        localStorage.setItem(LAST_AT_KEY, String(Date.now()));
      } catch {}

      if (count % MODAL_EVERY === 0) {
        setModalOpen(true);
        return;
      }

      // assistentes com peso maior: 2 de cada 3 pops são de assistentes
      const rotator = count % 3 === 0 ? rotators[(count / 3) % 2 === 0 ? 1 : 2] : rotators[0];
      const promo: PromoItem | null = rotator.next();
      if (!promo) return;

      toast(promo.title, {
        description: promo.description,
        duration: 10000,
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        action: {
          label: "Assinar e liberar +10 assistentes",
          onClick: () => navigate("/pricing"),
        },
        cancel: {
          label: "Continuar com Examinus grátis",
          onClick: () => navigate("/examinus"),
        },
      });
    };

    // agenda consistente: respeita o tempo já decorrido desde o último pop
    const lastAt = readNum(LAST_AT_KEY);
    const elapsed = lastAt ? Date.now() - lastAt : 0;
    const base = lastAt ? INTERVAL_MS : FIRST_DELAY_MS;
    const firstDelay = Math.max(15_000, base - elapsed);

    let intervalId = 0;
    const timeoutId = window.setTimeout(() => {
      show();
      intervalId = window.setInterval(show, INTERVAL_MS);
    }, firstDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [active, navigate]);

  if (!active) return null;

  return <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} reason="engagement" context="app" />;
}

