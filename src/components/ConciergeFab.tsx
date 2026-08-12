import { useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistentesAIChat } from "@/components/AssistentesAIChat";
import { cn } from "@/lib/utils";

/**
 * Botão flutuante do concierge MedStation.
 * Abre um painel com o chat público de dúvidas sobre a plataforma,
 * sem tirar o visitante da página.
 */
export function ConciergeFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Painel */}
      <div
        className={cn(
          "fixed z-[60] transition-all duration-300 ease-out",
          "inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-24 sm:w-[400px]",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
        role="dialog"
        aria-modal="false"
        aria-label="Concierge MedStation"
        aria-hidden={!open}
      >
        <div className="rounded-2xl border border-border/70 bg-card shadow-elevated overflow-hidden">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Fechar concierge"
          >
            <X className="h-4 w-4" />
          </Button>
          <AssistentesAIChat className="h-[60vh] max-h-[520px] sm:h-[480px]" />
        </div>

        </div>
      </div>

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar concierge MedStation" : "Abrir concierge MedStation"}
        aria-expanded={open}
        className={cn(
          "fixed z-[61] right-4 sm:right-5 bottom-4 sm:bottom-6",
          "inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3",
          "bg-primary text-primary-foreground shadow-elevated",
          "border border-primary/40 transition-all duration-300",
          "hover:-translate-y-0.5 hover:shadow-lg",
          open && "sm:opacity-100 opacity-0 pointer-events-none sm:pointer-events-auto",
        )}
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-foreground/25 animate-ping" />
          <MessageCircleQuestion className="relative h-5 w-5" strokeWidth={1.9} />
        </span>
        <span className="text-sm font-medium hidden sm:inline">Tirar dúvidas</span>
      </button>
    </>
  );
}
