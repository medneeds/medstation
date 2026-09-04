import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  ScanLine,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { StructuredResponse } from "@/components/chat/StructuredResponse";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";

const VALID_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const STORAGE_BUCKET = "evidences";
const RADIOLOGY_AGENT_TYPE = "examinus";
const RADIOLOGY_MODE = "radiology_interpreter";

type OutputMode = "auto" | "quick" | "report";

type MessageMetadata = {
  mode?: string;
  radiology_evidence_ids?: string[];
  output_mode?: OutputMode;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: MessageMetadata;
  pending?: boolean;
};

type Conversation = {
  id: string;
  name: string;
  last_message: string | null;
  updated_at: string;
  case_id: string | null;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type EvidenceInsertResult = {
  id: string;
  filePath: string;
};

interface RadiologyInterpreterProps {
  caseId?: string;
  onExit?: () => void;
}

function safeFileName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "jpg";
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "radiografia";
  return `${base}.${ext}`;
}

function metadataOf(row: unknown): MessageMetadata {
  if (!row || typeof row !== "object") return {};
  const value = (row as { metadata?: unknown }).metadata;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    mode: typeof raw.mode === "string" ? raw.mode : undefined,
    output_mode:
      raw.output_mode === "auto" || raw.output_mode === "quick" || raw.output_mode === "report"
        ? raw.output_mode
        : undefined,
    radiology_evidence_ids: Array.isArray(raw.radiology_evidence_ids)
      ? raw.radiology_evidence_ids.filter((v): v is string => typeof v === "string")
      : undefined,
  };
}

function toMessage(row: unknown): Message | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.content !== "string" || typeof r.created_at !== "string") return null;
  return {
    id: r.id,
    role: r.role === "assistant" ? "assistant" : "user",
    content: r.content,
    created_at: r.created_at,
    metadata: metadataOf(row),
  };
}

function evidenceIdsFromMessages(messages: Message[]) {
  const ids: string[] = [];
  for (const message of messages) {
    if (message.metadata?.mode !== RADIOLOGY_MODE) continue;
    for (const id of message.metadata.radiology_evidence_ids || []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function parseSseLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const parsed = JSON.parse(payload);
    return typeof parsed?.choices?.[0]?.delta?.content === "string"
      ? parsed.choices[0].delta.content
      : "";
  } catch {
    return "";
  }
}

export function RadiologyInterpreter({ caseId, onExit }: RadiologyInterpreterProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const historicalEvidenceIds = useMemo(() => evidenceIdsFromMessages(messages), [messages]);
  const canSend = !isLoading && !isUploading && (message.trim().length > 0 || pendingImages.length > 0);

  useEffect(() => {
    void loadRadiologyHistory();
    return () => {
      pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadRadiologyHistory = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("id,name,last_message,updated_at,case_id,messages(metadata)")
      .eq("user_id", auth.user.id)
      .eq("agent_type", RADIOLOGY_AGENT_TYPE)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (error || !data) return;

    const radiology = data
      .filter((row) => {
        const nested = (row as unknown as { messages?: unknown[] }).messages || [];
        return nested.some((m) => metadataOf(m).mode === RADIOLOGY_MODE);
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        last_message: row.last_message,
        updated_at: row.updated_at,
        case_id: row.case_id,
      }));

    setHistory(radiology);

    const savedId = localStorage.getItem("examinus_radiology_last_conversation");
    const initial = radiology.find((c) => c.id === savedId) || radiology[0];
    if (initial) await openConversation(initial);
  };

  const openConversation = async (item: Conversation) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", item.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Não foi possível abrir a interpretação", variant: "destructive" });
      return;
    }
    const parsed = (data || []).map(toMessage).filter((m): m is Message => !!m);
    setConversation(item);
    setMessages(parsed);
    localStorage.setItem("examinus_radiology_last_conversation", item.id);
  };

  const startNewConversation = () => {
    setConversation(null);
    setMessages([]);
    clearPendingImages();
    setMessage("");
    localStorage.removeItem("examinus_radiology_last_conversation");
  };

  const clearPendingImages = () => {
    setPendingImages((current) => {
      current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingImage = (id: string) => {
    setPendingImages((current) => {
      const target = current.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((p) => p.id !== id);
    });
  };

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    const invalid = files.find((file) => !VALID_MIME.has(file.type));
    if (invalid) {
      toast({
        title: "Formato não suportado no Interpretador",
        description: `${invalid.name}: use JPG, PNG ou WEBP. PDF e DICOM ficam fora da V1.`,
        variant: "destructive",
      });
      return;
    }
    const tooLarge = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      toast({
        title: "Imagem muito grande",
        description: `${tooLarge.name}: limite de 20 MB por imagem.`,
        variant: "destructive",
      });
      return;
    }
    if (pendingImages.length + files.length > MAX_IMAGES) {
      toast({
        title: `Máximo de ${MAX_IMAGES} imagens`,
        description: "Remova uma imagem antes de adicionar outra.",
        variant: "destructive",
      });
      return;
    }

    const next = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingImages((current) => [...current, ...next]);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
  };

  const uploadEvidence = async (file: File, userId: string): Promise<EvidenceInsertResult> => {
    const token = crypto.randomUUID();
    const filePath = `${userId}/radiology/${token}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(`Falha ao enviar ${file.name}`);

    const evidencePayload = {
      user_id: userId,
      case_id: caseId || conversation?.case_id || null,
      type: "image",
      source_type: "upload",
      title: file.name,
      file_path: filePath,
      file_size: file.size,
      origin: "examinus_interpreter",
      metadata: {
        mode: RADIOLOGY_MODE,
        modality: "xray",
        body_region: "chest",
        mime_type: file.type,
      },
    };

    const { data, error } = await supabase
      .from("evidences")
      .insert(evidencePayload)
      .select("id")
      .single();

    if (error || !data?.id) {
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      throw new Error(`Falha ao registrar ${file.name}`);
    }
    return { id: data.id, filePath };
  };

  const ensureConversation = async (userId: string): Promise<Conversation> => {
    if (conversation) return conversation;
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        agent_type: RADIOLOGY_AGENT_TYPE,
        name: "Interpretação · RX de tórax",
        case_id: caseId || null,
        last_message: "Radiografia de tórax",
      })
      .select("id,name,last_message,updated_at,case_id")
      .single();
    if (error || !data) throw new Error("Não foi possível criar a conversa.");
    const created: Conversation = data;
    setConversation(created);
    setHistory((current) => [created, ...current.filter((c) => c.id !== created.id)]);
    localStorage.setItem("examinus_radiology_last_conversation", created.id);
    return created;
  };

  const resolveOutputMode = (text: string): OutputMode => {
    const normalized = text.toLocaleLowerCase("pt-BR");
    if (/laudo/.test(normalized)) return "report";
    if (/avalia[cç][aã]o r[aá]pida|leitura r[aá]pida/.test(normalized)) return "quick";
    return "auto";
  };

  const streamInterpretation = async (
    token: string,
    evidenceIds: string[],
    chatMessages: Message[],
    outputMode: OutputMode,
  ) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radiograph-interpret`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatMessages
          .filter((m) => m.id !== "radiology-streaming")
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content })),
        evidenceIds: evidenceIds.slice(-MAX_IMAGES),
        caseId: caseId || conversation?.case_id || undefined,
        outputMode,
      }),
    });

    if (!response.ok || !response.body) {
      let reason = "Não foi possível interpretar a radiografia.";
      try {
        const body = await response.json();
        if (typeof body?.error === "string") reason = body.error;
      } catch {
        // Mantém mensagem segura.
      }
      throw new Error(reason);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index: number;
      while ((index = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        const delta = parseSseLine(line);
        if (!delta) continue;
        content += delta;
        setMessages((current) =>
          current.map((m) => (m.id === "radiology-streaming" ? { ...m, content } : m)),
        );
      }
    }
    return content.trim();
  };

  const send = async (forcedMode?: OutputMode) => {
    if (!canSend) return;
    const text = message.trim() || "Interprete esta radiografia de tórax.";
    const outputMode = forcedMode || resolveOutputMode(text);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) {
      toast({ title: "Sessão expirada", description: "Entre novamente para continuar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    let uploaded: EvidenceInsertResult[] = [];
    try {
      const conv = await ensureConversation(session.user.id);

      if (pendingImages.length > 0) {
        setIsUploading(true);
        uploaded = await Promise.all(
          pendingImages.map((pending) => uploadEvidence(pending.file, session.user.id)),
        );
        setIsUploading(false);
      }

      const newEvidenceIds = uploaded.map((u) => u.id);
      const allEvidenceIds = [...historicalEvidenceIds, ...newEvidenceIds].filter(
        (id, index, arr) => arr.indexOf(id) === index,
      );
      if (allEvidenceIds.length === 0) throw new Error("Envie uma radiografia antes de iniciar a interpretação.");

      const optimisticId = `radiology-user-${Date.now()}`;
      const userMetadata: MessageMetadata = {
        mode: RADIOLOGY_MODE,
        radiology_evidence_ids: newEvidenceIds.length > 0 ? newEvidenceIds : allEvidenceIds.slice(-MAX_IMAGES),
        output_mode: outputMode,
      };
      const optimisticUser: Message = {
        id: optimisticId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
        metadata: userMetadata,
        pending: true,
      };
      const streaming: Message = {
        id: "radiology-streaming",
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        metadata: { mode: RADIOLOGY_MODE, output_mode: outputMode },
      };
      const baseMessages = [...messages, optimisticUser];
      setMessages([...baseMessages, streaming]);
      setMessage("");
      clearPendingImages();

      const { data: persistedUser, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conv.id,
          role: "user",
          content: text,
          metadata: userMetadata,
        } as never)
        .select("*")
        .single();
      if (userError || !persistedUser) throw new Error("Não foi possível salvar a mensagem.");

      const savedUser = toMessage(persistedUser) || optimisticUser;
      const chatForModel = [...messages, savedUser];
      setMessages([...chatForModel, streaming]);

      const assistantContent = await streamInterpretation(
        session.access_token,
        allEvidenceIds,
        chatForModel,
        outputMode,
      );
      if (!assistantContent) throw new Error("O modelo não retornou uma interpretação.");

      const assistantMetadata: MessageMetadata = { mode: RADIOLOGY_MODE, output_mode: outputMode };
      const { data: persistedAssistant, error: assistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conv.id,
          role: "assistant",
          content: assistantContent,
          metadata: assistantMetadata,
        } as never)
        .select("*")
        .single();
      if (assistantError || !persistedAssistant) throw new Error("A interpretação foi gerada, mas não pôde ser salva.");

      const savedAssistant = toMessage(persistedAssistant) || {
        ...streaming,
        id: crypto.randomUUID(),
        content: assistantContent,
      };
      setMessages([...chatForModel, savedAssistant]);

      await supabase
        .from("conversations")
        .update({ last_message: text, updated_at: new Date().toISOString() })
        .eq("id", conv.id);
      setConversation((current) => current ? { ...current, last_message: text, updated_at: new Date().toISOString() } : current);
    } catch (error: unknown) {
      console.error("[RadiologyInterpreter] send failed", error);
      setMessages((current) => current.filter((m) => m.id !== "radiology-streaming" && !m.id.startsWith("radiology-user-")));
      toast({
        title: "Não foi possível concluir a interpretação",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsLoading(false);
    }
  };

  const copyMessage = async (item: Message) => {
    await navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/40 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
            <ScanLine className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-medium tracking-tight md:text-base">Interpretador · RX de tórax</h2>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                V1
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground md:text-xs">
              Segunda leitura multimodal da imagem original
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startNewConversation} disabled={isLoading}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nova
        </Button>
        {onExit && (
          <Button variant="ghost" size="sm" onClick={onExit} disabled={isLoading}>
            Voltar ao Examinus
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {history.length > 0 && (
          <aside className="hidden w-52 shrink-0 flex-col gap-2 border-r border-border/40 pr-3 lg:flex">
            <p className="px-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Interpretações</p>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1.5 pr-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openConversation(item)}
                    className={`w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${
                      conversation?.id === item.id
                        ? "border-primary/25 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1 py-2">
            {messages.length === 0 ? (
              <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-10 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5">
                  <ImageIcon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-base font-medium tracking-tight">Coloque a radiografia na mesa.</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Envie JPG, PNG ou WEBP. A imagem original vai para o modelo multimodal — não para OCR.
                  Contexto clínico é opcional.
                </p>
                <Button className="mt-5" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar radiografia
                </Button>
              </div>
            ) : (
              <div className="space-y-4 px-1 md:px-3">
                {messages.map((item) => {
                  const thinking = item.id === "radiology-streaming" && !item.content;
                  return (
                    <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`group relative max-w-[94%] rounded-2xl px-4 py-3 md:max-w-[88%] ${
                          item.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/50 bg-muted/25 pb-9"
                        }`}
                      >
                        {thinking ? (
                          <ThinkingIndicator />
                        ) : item.role === "assistant" ? (
                          <StructuredResponse content={item.content} size="chat" />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                        )}
                        {item.role === "assistant" && !thinking && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute bottom-1.5 right-1.5 h-7 px-2 text-xs"
                            onClick={() => void copyMessage(item)}
                          >
                            {copiedId === item.id ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                            {copiedId === item.id ? "Copiado" : "Copiar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border/50 pt-3">
            {pendingImages.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {pendingImages.map((pending) => (
                  <Card key={pending.id} className="relative h-24 w-24 shrink-0 overflow-hidden border-border/60">
                    <img src={pending.previewUrl} alt={pending.file.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                      onClick={() => removePendingImage(pending.id)}
                      aria-label={`Remover ${pending.file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-background/85 px-1.5 py-1 backdrop-blur-sm">
                      <p className="truncate text-[9px] text-muted-foreground">{pending.file.name}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {historicalEvidenceIds.length > 0 && pendingImages.length === 0 && (
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ImageIcon className="h-3 w-3 text-primary" />
                <span>{historicalEvidenceIds.length} radiografia{historicalEvidenceIds.length > 1 ? "s" : ""} vinculada{historicalEvidenceIds.length > 1 ? "s" : ""} à conversa</span>
              </div>
            )}

            <div className="relative">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Envie uma radiografia de tórax e, se quiser, descreva o contexto clínico."
                rows={3}
                disabled={isLoading}
                className="min-h-[104px] resize-none rounded-2xl border-2 border-border/40 bg-muted/20 p-4 pb-14 pr-4 text-sm focus:border-primary/60 focus:bg-background"
              />
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || pendingImages.length >= MAX_IMAGES}
                  className="h-8 rounded-lg px-2.5 text-xs"
                >
                  {isUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}
                  Anexar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden h-8 rounded-lg px-2.5 text-xs sm:inline-flex"
                  disabled={isLoading || historicalEvidenceIds.length === 0}
                  onClick={() => { setMessage("Avaliação rápida desta radiografia."); void send("quick"); }}
                >
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  Rápida
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden h-8 rounded-lg px-2.5 text-xs sm:inline-flex"
                  disabled={isLoading || historicalEvidenceIds.length === 0}
                  onClick={() => { setMessage("Faça o laudo desta radiografia."); void send("report"); }}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Laudo
                </Button>
              </div>
              <Button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="absolute bottom-2.5 right-2.5 h-9 rounded-xl px-4"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 h-3.5 w-3.5" />Enviar</>}
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] leading-relaxed text-muted-foreground">
              Análise radiográfica preliminar para apoio profissional. V1: RX de tórax em JPG, PNG ou WEBP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
