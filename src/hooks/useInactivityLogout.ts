import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hour
const WARNING_MS = 5 * 60 * 1000; // 5 min warning before logout
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
] as const;

/**
 * Logs the user out automatically after 1 hour of inactivity.
 * Activity = mouse, keyboard, touch, scroll or tab focus.
 */
export function useInactivityLogout(enabled: boolean) {
  const logoutTimer = useRef<number | null>(null);
  const warningTimer = useRef<number | null>(null);
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const clearTimers = () => {
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
      if (warningTimer.current) window.clearTimeout(warningTimer.current);
    };

    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        toast.error("Sessão encerrada por inatividade", {
          description: "Você ficou 1 hora sem atividade. Faça login novamente.",
        });
      }
    };

    const reset = () => {
      lastActivity.current = Date.now();
      clearTimers();
      warningTimer.current = window.setTimeout(() => {
        toast.warning("Sua sessão expirará em 5 minutos", {
          description: "Mexa o mouse ou toque na tela para continuar conectado.",
        });
      }, INACTIVITY_MS - WARNING_MS);
      logoutTimer.current = window.setTimeout(doLogout, INACTIVITY_MS);
    };

    const onActivity = () => {
      // throttle: ignore bursts within 1s
      if (Date.now() - lastActivity.current < 1000) return;
      reset();
    };

    reset();
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [enabled]);
}
