import { useLocation, useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FAB global "Gravar consulta": acesso de 1 clique ao Modo Consultório
 * a partir de qualquer página do dashboard. Inspirado no botão flutuante
 * do WhatsApp — sempre visível, sempre à mão.
 */
export function FloatingConsultationButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Esconder na própria página do consultório e em fluxos de auth/onboarding
  const HIDDEN_ROUTES = ["/consultorio", "/auth", "/onboarding", "/welcome"];
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/consultorio")}
      aria-label="Gravar consulta agora"
      title="Gravar consulta agora"
      className={cn(
        "fixed bottom-5 right-5 md:bottom-6 md:right-6 z-40",
        "h-14 px-5 md:h-14 md:px-6 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)]",
        "hover:shadow-[0_14px_36px_-8px_hsl(var(--primary)/0.75)]",
        "hover:scale-[1.03] active:scale-[0.98]",
        "transition-all duration-200 ease-precise",
        "flex items-center gap-2.5 font-semibold text-sm",
        "ring-1 ring-primary/30",
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary-foreground/60 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-foreground" />
      </span>
      <Mic className="h-4 w-4" />
      <span className="hidden sm:inline">Gravar consulta</span>
    </button>
  );
}
