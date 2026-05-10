import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ASSISTANT_PROMOS,
  PRODUCTIVITY_PROMOS,
  OFFER_PROMOS,
  pickRandom,
  type PromoItem,
} from "@/lib/demoPromoContent";
import { UpgradeModal } from "./UpgradeModal";
import { PromoBanner } from "./PromoBanner";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const COOLDOWN_BETWEEN_POPUPS_MS = 60_000; // 60s entre quaisquer pop-ups
const DISMISSED_TTL_MS = 5 * 60_000; // 5min para não repetir o mesmo
const DISMISSED_KEY = "ms_demo_promo_dismissed";

const TIME_TRIGGERS: Array<{
  at: number;
  format: "toast" | "banner" | "modal";
  source: "productivity" | "assistant" | "offer" | "modal";
}> = [
  { at: 90_000, format: "toast", source: "productivity" },
  { at: 4 * 60_000, format: "toast", source: "assistant" },
  { at: 8 * 60_000, format: "banner", source: "offer" },
  { at: 14 * 60_000, format: "modal", source: "modal" },
];

function readDismissed(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const now = Date.now();
    const fresh: Record<string, number> = {};
    Object.entries(obj as Record<string, number>).forEach(([k, v]) => {
      if (now - v < DISMISSED_TTL_MS) fresh[k] = v;
    });
    return fresh;
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, number>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  } catch {}
}

interface DemoPromoEngineProps {
  /** Container do demo a observar via IntersectionObserver. Se ausente, conta tempo desde o mount. */
  observeTargetId?: string;
}

export function DemoPromoEngine({ observeTargetId }: DemoPromoEngineProps) {
  const navigate = useNavigate();
  const [bannerPromo, setBannerPromo] = useState<PromoItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReason, setModalReason] = useState<"limit-reached" | "cooldown" | "engagement">("engagement");
  const lastPopupAtRef = useRef(0);
  const visibleSinceRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);
  const firedTimeTriggersRef = useRef<Set<number>>(new Set());
  const extractionCountRef = useRef(0);
  const recentlyShownRef = useRef<string[]>([]);

  const canShowPopup = () => Date.now() - lastPopupAtRef.current >= COOLDOWN_BETWEEN_POPUPS_MS;

  const markShown = (id: string) => {
    lastPopupAtRef.current = Date.now();
    recentlyShownRef.current = [id, ...recentlyShownRef.current].slice(0, 6);
  };

  const isDismissed = (id: string) => Boolean(readDismissed()[id]);

  const dismiss = (id: string) => {
    const m = readDismissed();
    m[id] = Date.now();
    writeDismissed(m);
  };

  const showToast = (promo: PromoItem) => {
    if (isDismissed(promo.id) || !canShowPopup()) return;
    markShown(promo.id);
    toast(promo.title, {
      description: promo.description,
      duration: 7000,
      icon: <Sparkles className="w-4 h-4 text-primary" />,
      action: promo.cta
        ? {
            label: promo.cta,
            onClick: () => navigate("/auth"),
          }
        : undefined,
      onDismiss: () => dismiss(promo.id),
      onAutoClose: () => dismiss(promo.id),
    });
  };

  const showBanner = (promo: PromoItem) => {
    if (isDismissed(promo.id) || !canShowPopup()) return;
    markShown(promo.id);
    setBannerPromo(promo);
  };

  const openModal = (reason: "limit-reached" | "cooldown" | "engagement") => {
    if (!canShowPopup() && reason === "engagement") return;
    lastPopupAtRef.current = Date.now();
    setModalReason(reason);
    setModalOpen(true);
  };

  const pickPromo = (source: "productivity" | "assistant" | "offer"): PromoItem | null => {
    const pool =
      source === "productivity"
        ? PRODUCTIVITY_PROMOS
        : source === "assistant"
          ? ASSISTANT_PROMOS
          : OFFER_PROMOS;
    return pickRandom(pool, recentlyShownRef.current);
  };

  // ---------- Time-based triggers ----------
  useEffect(() => {
    let raf = 0;
    let lastTick = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTick;
      lastTick = now;

      if (visibleSinceRef.current !== null) {
        accumulatedMsRef.current += delta;
      }

      for (const trig of TIME_TRIGGERS) {
        if (accumulatedMsRef.current >= trig.at && !firedTimeTriggersRef.current.has(trig.at)) {
          firedTimeTriggersRef.current.add(trig.at);
          if (trig.format === "modal") {
            openModal("engagement");
          } else if (trig.source !== "modal") {
            const promo = pickPromo(trig.source);
            if (promo) {
              if (trig.format === "toast") showToast(promo);
              else showBanner(promo);
            }
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Visibility observer ----------
  useEffect(() => {
    if (!observeTargetId) {
      visibleSinceRef.current = performance.now();
      return;
    }
    const el = document.getElementById(observeTargetId);
    if (!el) {
      visibleSinceRef.current = performance.now();
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (visibleSinceRef.current === null) visibleSinceRef.current = performance.now();
          } else {
            visibleSinceRef.current = null;
          }
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [observeTargetId]);

  // ---------- Event-based triggers ----------
  useEffect(() => {
    const onExtraction = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const count = typeof detail.count === "number" ? detail.count : ++extractionCountRef.current;
      extractionCountRef.current = count;

      if (count === 1) {
        const promo = pickPromo("assistant");
        if (promo) setTimeout(() => showBanner(promo), 1200);
      } else if (count === 3) {
        const promo = pickPromo("offer");
        if (promo) setTimeout(() => showToast(promo), 800);
      }
    };

    const onLimit = () => openModal("limit-reached");
    const onCooldownClick = () => openModal("cooldown");
    const onForceModal = () => openModal("engagement");

    window.addEventListener("demo:extraction-completed", onExtraction);
    window.addEventListener("demo:limit-reached", onLimit);
    window.addEventListener("demo:open-upgrade", onCooldownClick);
    window.addEventListener("demo:cooldown-click", onCooldownClick);
    window.addEventListener("demo:force-upgrade-modal", onForceModal);

    return () => {
      window.removeEventListener("demo:extraction-completed", onExtraction);
      window.removeEventListener("demo:limit-reached", onLimit);
      window.removeEventListener("demo:open-upgrade", onCooldownClick);
      window.removeEventListener("demo:cooldown-click", onCooldownClick);
      window.removeEventListener("demo:force-upgrade-modal", onForceModal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {bannerPromo && (
        <PromoBanner
          promo={bannerPromo}
          onDismiss={() => {
            dismiss(bannerPromo.id);
            setBannerPromo(null);
          }}
          onOpenUpgrade={() => {
            setBannerPromo(null);
            openModal("engagement");
          }}
        />
      )}
      <UpgradeModal open={modalOpen} onOpenChange={setModalOpen} reason={modalReason} />
    </>
  );
}
