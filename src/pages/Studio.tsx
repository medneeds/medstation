import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Loader2, SendHorizonal, Bot, Paperclip, X, FileText, Check, ChevronDown, Plus, Sparkles, Library } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NEW_STUDIO_ASSISTANT, StudioAssistantDialog } from "@/components/studio/StudioAssistantDialog";
import { STUDIO_PREFILL_KEY } from "@/lib/prompteca";
import { AgentVoiceInput, type VoiceDeliveryOptions } from "@/components/AgentVoiceInput";
import { applySpoken } from "@/lib/voiceAccess";
import { STUDIO_FILE_ACCEPT, composeStudioMessage, readStudioFile } from "@/lib/studioFiles";
import { toast } from "sonner";
import { StudioRobot } from "@/components/studio/StudioRobot";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  STUDIO_MODELS, MAX_STUDIO_CHARS, createThread, getThread, saveThread, useStudioStore,
  type StudioAssistant, type StudioModelId, type StudioThread,
} from "@/lib/studio";

export default function Studio() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { enabled, assistants, loaded, saveStatus } = useStudioStore();
  const [editingAssistant, setEditingAssistant] = useState<Partial<StudioAssistant> | null>(null);
  const [thread, setThread] = useState<StudioThread | undefined>(() => (threadId ? getThread(threadId) : undefined));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; name: string; text: string }[]>([]);
  const [reading, setReading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) {
      const t = createThread();
      navigate(`/studio/${t.id}`, { replace: true });
      return;
    }
    const t = getThread(threadId);
    if (!t) {
      // Ainda buscando a linha do tempo da conta: espera antes de concluir que não existe.
      if (loaded) navigate("/studio", { replace: true });
      return;
    }
    if (thread?.id === t.id) return;
    setThread(t);
    const prefill = sessionStorage.getItem(STUDIO_PREFILL_KEY);
    if (prefill) sessionStorage.removeItem(STUDIO_PREFILL_KEY);
    setInput(prefill ? prefill.slice(0, MAX_STUDIO_CHARS) : "");
    setAttachments([]);
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, navigate, loaded]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread?.messages.length, busy]);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-3">
        <h1 className="text-xl font-semibold">Studio está desligado</h1>
        <p className="text-sm text-muted-foreground">Ligue a chave "Studio (Beta)" no topo da barra lateral para usar.</p>
      </div>
    );
  }
  if (!thread) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Abrindo conversa...
      </div>
    );
  }
  const assistant = assistants.find((a) => a.id === thread.assistantId);

  // Salva sempre; só troca a tela se o médico ainda estiver nessa conversa (resposta pode chegar depois).
  const update = (t: StudioThread) => { saveThread(t); setThread((prev) => (prev?.id === t.id ? t : prev)); };

  /** Troca o assistente da conversa; as próximas respostas seguem as instruções dele. */
  const chooseAssistant = (a?: StudioAssistant) => {
    const fresh = thread.messages.length === 0;
    update({
      ...thread,
      assistantId: a?.id,
      model: a?.model ?? thread.model,
      title: fresh ? (a ? a.name : "Nova conversa") : thread.title,
      updatedAt: Date.now(),
    });
    if (!fresh) toast.success(a ? `As próximas respostas seguem ${a.name}.` : "As próximas respostas são da IA livre.");
    inputRef.current?.focus();
  };

  const addFiles = async (files: File[]) => {
    for (const f of files) {
      setReading((n) => n + 1);
      try {
        const text = await readStudioFile(f);
        setAttachments((prev) => [...prev, { id: `${Date.now()}-${f.name}`, name: f.name, text }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Não consegui ler ${f.name}`);
      } finally {
        setReading((n) => n - 1);
      }
    }
    inputRef.current?.focus();
  };

  const send = async () => {
    if (busy || reading > 0 || (!input.trim() && attachments.length === 0)) return;
    const typed = input;
    const sentAttachments = attachments;
    const text = composeStudioMessage(input, attachments, MAX_STUDIO_CHARS);
    const messages = [...thread.messages, { role: "user" as const, content: text }];
    const title = thread.messages.length === 0 && !assistant ? (typed.trim() || sentAttachments[0]?.name || "Nova conversa").slice(0, 60) : thread.title;
    let current: StudioThread = { ...thread, title, messages, updatedAt: Date.now() };
    update(current);
    setInput("");
    setAttachments([]);
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
      update({ ...current, messages: thread.messages });
      setInput(typed);
      setAttachments(sentAttachments);
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
          {thread.messages.length > 0 && (
            <span className={`shrink-0 text-2xs ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
              {saveStatus === "saving" ? "Salvando..." : saveStatus === "error" ? "Sem conexão: salvo aqui, enviando de novo" : "Salvo"}
            </span>
          )}
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
            <div className="flex flex-col items-center pt-8 text-center sm:pt-14">
              <StudioRobot className="h-36 w-36 sm:h-44 sm:w-44" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {assistant ? assistant.name : "Como posso ajudar hoje?"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {assistant ? `Converse com ${assistant.name}.` : "Escolha a IA no topo e escreva, fale ou anexe uma foto ou arquivo."}
              </p>
            </div>
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

      <div
        className="mx-auto w-full max-w-3xl"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files)); }}
      >
        {(attachments.length > 0 || reading > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a) => (
              <span key={a.id} className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs">
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{a.name}</span>
                <button type="button" aria-label={`Remover ${a.name}`} onClick={() => setAttachments((p) => p.filter((x) => x.id !== a.id))}>
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </span>
            ))}
            {reading > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Lendo arquivo...
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-card p-2">
          <input ref={fileRef} type="file" multiple accept={STUDIO_FILE_ACCEPT} className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) addFiles(f); }} />
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" disabled={busy}
            onClick={() => fileRef.current?.click()} aria-label="Anexar foto ou arquivo" title="Anexar foto ou arquivo">
            <Paperclip className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" disabled={busy} aria-label="Escolher assistente" title="Escolher assistente"
                className={`h-10 shrink-0 gap-1 rounded-full px-2.5 ${assistant ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : ""}`}>
                <Bot className="h-4 w-4 shrink-0" />
                <span className={`max-w-[120px] truncate text-xs ${assistant ? "" : "hidden sm:inline"}`}>{assistant ? assistant.name : "Assistente"}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64">
              <DropdownMenuLabel className="text-2xs font-normal text-muted-foreground">Responder como</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => chooseAssistant(undefined)} className="gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">IA livre (sem assistente)</span>
                {!assistant && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              {assistants.length > 0 && <DropdownMenuSeparator />}
              {assistants.map((a) => (
                <DropdownMenuItem key={a.id} onSelect={() => chooseAssistant(a)} className="gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{a.name}</span>
                  {assistant?.id === a.id && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditingAssistant({ ...NEW_STUDIO_ASSISTANT })} className="gap-2">
                <Plus className="h-4 w-4" /> Criar assistente
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/prompteca")} className="gap-2">
                <Library className="h-4 w-4" /> Explorar a Prompteca
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea ref={inputRef} autoFocus value={input} maxLength={MAX_STUDIO_CHARS} rows={2}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); addFiles(f); } }}
            placeholder="Escreva, fale ou anexe uma foto ou arquivo..." className="min-h-[52px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <AgentVoiceInput
            onTranscription={(t: string, o?: VoiceDeliveryOptions) => setInput((prev) => applySpoken(prev, t, o?.replace))}
            disabled={busy}
            context="studio"
            compact
          />
          <Button size="icon" onClick={send} disabled={busy || reading > 0 || (!input.trim() && attachments.length === 0)} aria-label="Enviar">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <StudioAssistantDialog value={editingAssistant} onClose={() => setEditingAssistant(null)} onSaved={(a) => chooseAssistant(a)} />
    </div>
  );
}
