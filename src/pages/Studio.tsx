import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Loader2, SendHorizonal, Bot } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  STUDIO_MODELS, MAX_STUDIO_CHARS, createThread, getAssistant, getThread, saveThread, useStudioStore,
  type StudioModelId, type StudioThread,
} from "@/lib/studio";

export default function Studio() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { enabled } = useStudioStore();
  const [thread, setThread] = useState<StudioThread | undefined>(() => (threadId ? getThread(threadId) : undefined));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) {
      const t = createThread();
      navigate(`/studio/${t.id}`, { replace: true });
      return;
    }
    const t = getThread(threadId);
    if (!t) { navigate("/studio", { replace: true }); return; }
    setThread(t);
    setInput("");
    inputRef.current?.focus();
  }, [threadId, navigate]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread?.messages.length, busy]);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-3">
        <h1 className="text-xl font-semibold">Studio está desligado</h1>
        <p className="text-sm text-muted-foreground">Ligue a chave "Studio (Beta)" no topo da barra lateral para usar.</p>
      </div>
    );
  }
  if (!thread) return null;
  const assistant = getAssistant(thread.assistantId);

  const update = (t: StudioThread) => { setThread(t); saveThread(t); };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const messages = [...thread.messages, { role: "user" as const, content: text }];
    const title = thread.messages.length === 0 && !assistant ? text.slice(0, 60) : thread.title;
    let current: StudioThread = { ...thread, title, messages, updatedAt: Date.now() };
    update(current);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("studio-chat", {
        body: { model: current.model, instructions: assistant?.instructions, messages },
      });
      if (error || !data?.text) throw new Error(data?.error || "Não foi possível responder agora. Tente de novo.");
      current = { ...current, messages: [...messages, { role: "assistant", content: data.text, model: current.model }], updatedAt: Date.now() };
      update(current);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível responder agora.");
      setInput(text);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Bot className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{assistant ? assistant.name : "IA livre"}</span>
        </div>
        <Select value={thread.model} onValueChange={(v) => update({ ...thread, model: v as StudioModelId })}>
          <SelectTrigger className="h-9 w-[200px]" aria-label="Modelo de IA"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STUDIO_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <div className="mx-auto max-w-3xl space-y-6 px-1">
          {thread.messages.length === 0 && (
            <p className="pt-16 text-center text-sm text-muted-foreground">
              {assistant ? `Converse com ${assistant.name}.` : "Escolha a IA no topo e escreva o que precisar."}
            </p>
          )}
          {thread.messages.map((m, i) => m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
          ) : (
            <div key={i} className="group space-y-1">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.content}</div>
              <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                <span>{STUDIO_MODELS.find((x) => x.id === m.model)?.label}</span>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copiado"); }}>
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Pensando...</div>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2">
          <Textarea ref={inputRef} autoFocus value={input} maxLength={MAX_STUDIO_CHARS} rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Escreva sua mensagem..." className="min-h-[52px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Button size="icon" onClick={send} disabled={busy || !input.trim()} aria-label="Enviar">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
