import { useEffect, useRef, useState } from "react";
import { Copy, FlaskConical, Loader2, RotateCcw, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_STUDIO_CHARS, STUDIO_MODELS, type StudioModelId } from "@/lib/studio";
import { askStudio, type StudioMsg } from "./askStudio";

/** Teste antes de salvar: conversa curta com a versão do editor; nada fica salvo. */
export function TestPanel({ model, instructions, name }: { model: StudioModelId; instructions: string; name: string }) {
  const [messages, setMessages] = useState<StudioMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ready = !!instructions.trim();
  const label = STUDIO_MODELS.find((m) => m.id === model)?.label ?? "IA";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !ready) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await askStudio(model, instructions, next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível testar agora.");
      setMessages(messages);
      setInput(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto max-w-sm pt-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><FlaskConical className="h-5 w-5" /></div>
            <p className="mt-3 text-sm font-medium text-foreground">Veja como {name.trim() || "o assistente"} responde</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mande um caso de exemplo, sem dados que identifiquem o paciente. O teste usa o texto do editor, mesmo sem salvar, e não fica guardado.
            </p>
            {!ready && <p className="mt-3 text-xs text-destructive">Escreva ou cole as instruções primeiro.</p>}
          </div>
        )}
        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.content}</div>
        ) : (
          <div key={i} className="group">
            <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground">{m.content}</div>
            <button type="button" className="mt-1 inline-flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground"
              onClick={() => { void navigator.clipboard.writeText(m.content); toast.success("Copiado"); }}>
              <Copy className="h-3 w-3" /> Copiar
            </button>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {label} respondendo...</div>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-1.5 focus-within:ring-1 focus-within:ring-ring">
          <Textarea value={input} rows={2} maxLength={MAX_STUDIO_CHARS} disabled={!ready}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Cole um caso de exemplo para testar..." className="min-h-[44px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button size="icon" onClick={send} disabled={busy || !ready || !input.trim()} aria-label="Enviar teste">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-muted-foreground">
          <span>Testando com {label}</span>
          {messages.length > 0 && (
            <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setMessages([])} disabled={busy}>
              <RotateCcw className="h-3 w-3" /> Limpar teste
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
