import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isTerminalWelcomeResult,
  markWelcomeAttempted,
  shouldAttemptWelcome,
} from "@/lib/welcomeEmail";

/**
 * Garante que todo usuário realmente novo receba exatamente um e-mail de
 * boas-vindas/teste de 7 dias, tanto no cadastro por Google quanto por
 * magic link. A decisão de enviar é sempre do servidor.
 */
export function WelcomeEmailTrigger() {
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async (userId: string | undefined) => {
      const storage = typeof window !== "undefined" ? window.localStorage : null;
      if (!userId || inFlight.current === userId) return;
      if (!shouldAttemptWelcome(userId, storage)) return;
      inFlight.current = userId;
      try {
        const { data, error } = await supabase.functions.invoke("send-first-welcome", {
          body: {},
        });
        const reason = (data as { reason?: string } | null)?.reason;
        if (active && isTerminalWelcomeResult(reason, Boolean(error))) {
          markWelcomeAttempted(userId, storage);
        }
      } catch {
        /* falha transitória: nova tentativa na próxima sessão */
      } finally {
        inFlight.current = null;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (active) void run(data.session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setTimeout(() => {
          if (active) void run(session?.user?.id);
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
