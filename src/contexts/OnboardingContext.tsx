import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDiscoveryPathId, type DiscoveryPathId } from "@/lib/discoveryPaths";

export type OnboardingStatus = "loading" | "pending" | "completed" | "anonymous" | "error";

interface OnboardingState {
  status: OnboardingStatus;
  primaryPath: DiscoveryPathId | null;
  recommendedTools: string[];
  refresh: () => Promise<void>;
  markCompleted: (primaryPath: DiscoveryPathId, recommendedTools: string[]) => void;
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [primaryPath, setPrimaryPath] = useState<DiscoveryPathId | null>(null);
  const [recommendedTools, setRecommendedTools] = useState<string[]>([]);
  const loadedForUser = useRef<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        loadedForUser.current = null;
        setPrimaryPath(null);
        setRecommendedTools([]);
        setStatus("anonymous");
        return;
      }

      // Uma consulta por sessão de usuário; invalidada ao concluir o onboarding.
      if (!force && loadedForUser.current === user.id) return;

      const { data, error } = await supabase
        .from("user_onboarding")
        .select("completed_at, primary_path, recommended_tools")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // Erro transitório nunca vira bloqueio permanente.
        console.debug("[onboarding] status fetch failed", error.message);
        setStatus("error");
        return;
      }

      loadedForUser.current = user.id;

      if (!data) {
        // Sem linha registrada: conta anterior à personalização, não bloquear.
        setStatus("completed");
        setPrimaryPath(null);
        setRecommendedTools([]);
        return;
      }

      setPrimaryPath(isDiscoveryPathId(data.primary_path) ? data.primary_path : null);
      setRecommendedTools(Array.isArray(data.recommended_tools) ? data.recommended_tools : []);
      setStatus(data.completed_at ? "completed" : "pending");
    } catch (e) {
      console.debug("[onboarding] unexpected status error", e);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        loadedForUser.current = null;
        setPrimaryPath(null);
        setRecommendedTools([]);
        setStatus("anonymous");
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") load();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const markCompleted = useCallback((path: DiscoveryPathId, tools: string[]) => {
    setPrimaryPath(path);
    setRecommendedTools(tools);
    setStatus("completed");
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        status,
        primaryPath,
        recommendedTools,
        refresh: () => load(true),
        markCompleted,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingState {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    return {
      status: "completed",
      primaryPath: null,
      recommendedTools: [],
      refresh: async () => {},
      markCompleted: () => {},
    };
  }
  return ctx;
}
