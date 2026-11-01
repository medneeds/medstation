import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  COPILOT_SUGGESTIONS,
  claimCopilotAsk,
  resetCopilot,
  sendCopilotMessage,
  useCopilot,
  type CopilotFeature,
} from "@/lib/copilot";

interface CopilotChatProps {
  /** "card": aberto no topo do painel; "panel": dentro do painel lateral */
  variant: "card" | "panel";
  /** Chamado depois de navegar por um botão (o painel lateral se fecha). */
  onNavigate?: () => void;
  /** Pergunta enviada de fora (ex.: "Tirar dúvida" no guia). */
  ask?: { text: string; nonce: number };
  className?: string;
}

/**
 * Copiloto MedStation: tira dúvidas de uso e leva ao assistente certo com um toque.
 * A mesma conversa aparece no card do painel e no painel lateral.
 */
export function CopilotChat({ variant, onNavigate, ask, className }: CopilotChatProps) {
  const navigate = useNavigate();
  const { messages, loading } = useCopilot();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const hasConversation = messages.length > 0;

  // Mantém a última mensagem visível dentro da própria caixa do chat.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  useEffect(() => {
    if (!ask || !ask.text.trim() || !claimCopilotAsk(ask.nonce)) return;
    void send(ask.text, "guia");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.nonce]);

  const send = async (text: string, source: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setDraft("");
    trackEvent("help_copilot_question_sent", { source, origin: variant });
    await sendCopilotMessage(clean);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft, "digitado");
  };

  const open = (feature: CopilotFeature) => {
    trackEvent("help_copilot_action_clicked", { feature: feature.id, destination: feature.route, origin: variant });
    navigate(feature.route);
    onNavigate?.();
  };

  const isCard = variant === "card";

  return (
    <section
      aria-label="Copiloto MedStation"
      className={cn(
        "flex flex-col",
        isCard && "rounded-2xl border border-primary/25 bg-card shadow-sm overflow-hidden",
        !isCard && "h-full",
        className,
      )}
    >
      <header className={cn("flex items-start gap-3", isCard ? "px-4 pt-4 md:px-5 md:pt-5" : "px-1 pb-2")}>
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-semibold tracking-tight">Copiloto MedStation</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Qual é a sua dúvida hoje? Pergunte como usar qualquer recurso e eu te levo ao assistente certo.
          </p>
        </div>
        {hasConversation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetCopilot}
            disabled={loading}
            className="h-11 w-11 shrink-0 p-0 md:h-8 md:w-8"
            aria-label="Começar nova conversa com o Copiloto"
            title="Nova conversa"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div
        ref={listRef}
        className={cn(
          "space-y-3 overflow-y-auto",
          isCard ? "max-h-[45vh] md:max-h-80 px-4 md:px-5 pt-3" : "flex-1 min-h-0 px-1",
          !hasConversation && isCard && "pt-1",
        )}
        aria-busy={loading}
      >
        {!hasConversation && (
          <div className="flex flex-wrap gap-2" aria-label="Sugestões de perguntas" role="group">
            {COPILOT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s, "sugestao")}
                disabled={loading}
                className="min-h-11 md:min-h-9 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs md:text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground whitespace-pre-wrap break-words">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={m.id} className="space-y-2" aria-live="polite">
              <p
                className={cn(
                  "max-w-[92%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  m.error ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </p>
              {m.actions && m.actions.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Atalhos sugeridos pelo Copiloto">
                  {m.actions.map((f, i) => (
                    <Button
                      key={f.id}
                      type="button"
                      size="sm"
                      variant={i === 0 ? "default" : "outline"}
                      onClick={() => open(f)}
                      className="min-h-11 md:min-h-9 gap-1.5"
                    >
                      Abrir {f.name}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {loading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Copiloto pensando...
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className={cn("flex items-center gap-2", isCard ? "p-4 md:p-5" : "pt-3")}>
        <label htmlFor={`copilot-input-${variant}`} className="sr-only">
          Sua dúvida para o Copiloto
        </label>
        <Input
          id={`copilot-input-${variant}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ex.: como transformo a consulta gravada em anamnese?"
          maxLength={1500}
          disabled={loading}
          autoComplete="off"
          className="h-11 text-base md:text-sm"
        />
        <Button
          type="submit"
          disabled={loading || !draft.trim()}
          className="h-11 w-11 shrink-0 p-0"
          aria-label="Enviar pergunta ao Copiloto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </form>
      {isCard && (
        <p className="-mt-2 px-4 pb-4 text-[11px] text-muted-foreground md:px-5">
          Para dúvidas de uso da plataforma. Não envie dados de pacientes aqui.
        </p>
      )}
    </section>
  );
}
