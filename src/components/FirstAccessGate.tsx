import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOnboarding } from "@/contexts/OnboardingContext";

/**
 * Envia para /onboarding somente contas novas com personalização pendente.
 * Contas antigas (backfill com completed_at) e falhas transitórias de consulta
 * seguem normalmente — o gate nunca vira bloqueio permanente nem loop.
 */
export function FirstAccessGate({ children }: { children: ReactNode }) {
  const { status } = useOnboarding();
  const { pathname, search } = useLocation();

  const isEmbed =
    typeof window !== "undefined" &&
    new URLSearchParams(search || window.location.search).get("embed") === "1";

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (status === "pending" && !isEmbed && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
