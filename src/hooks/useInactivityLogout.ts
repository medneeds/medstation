import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
const WARNING_MS = 5 * 60 * 1000; // aviso 5 min antes
const CHECK_INTERVAL_MS = 30 * 1000; // verificação periódica (robusta a throttling)
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

/**
 * Desloga automaticamente após 30 minutos de inatividade.
 * Atividade = mouse, teclado, toque ou scroll.
 *
 * Implementação baseada em timestamp + verificação periódica (setInterval),
 * porque setTimeout é fortemente estrangulado pelo navegador em abas em
 * segundo plano e podia nunca disparar o logout. Ao retornar à aba, se o
 * tempo de inatividade já excedeu o limite, o logout acontece imediatamente
 * em vez de o timer ser reiniciado.
 */
export function useInactivityLogout(enabled: boolean) {
  const lastActivity = useRef<number>(Date.now());
  const warned = useRef(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    lastActivity.current = Date.now();
    warned.current = false;
    loggingOut.current = false;

    const doLogout = async () => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        await supabase.auth.signOut();
      } finally {
        toast.error("Sessão encerrada por inatividade", {
          description: "Você ficou 1 hora sem atividade. Faça login novamente.",
        });
      }
    };

    const check = () => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= INACTIVITY_MS) {
        doLogout();
        return;
      }
      if (!warned.current && elapsed >= INACTIVITY_MS - WARNING_MS) {
        warned.current = true;
        toast.warning("Sua sessão expirará em 5 minutos", {
          description: "Mexa o mouse ou toque na tela para continuar conectado.",
        });
      }
    };

    const onActivity = () => {
      const now = Date.now();
      // Se já passou do limite, não "revive" a sessão — desloga.
      if (now - lastActivity.current >= INACTIVITY_MS) {
        check();
        return;
      }
      // throttle: ignora rajadas em menos de 1s
      if (now - lastActivity.current < 1000) return;
      lastActivity.current = now;
      warned.current = false;
    };

    const onVisibility = () => {
      // Voltar à aba NÃO conta como atividade que reinicia o timer:
      // apenas avalia se o limite já estourou enquanto a aba estava inativa.
      if (document.visibilityState === "visible") check();
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
