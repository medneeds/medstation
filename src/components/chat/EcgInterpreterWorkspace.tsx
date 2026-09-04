import { useEffect, useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  Loader2,
  LogOut,
  Maximize2,
  Plus,
  Send,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StructuredResponse } from "@/components/chat/StructuredResponse";
import { StreamCursor } from "@/components/chat/StreamCursor";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import {
  ECG_FOLLOW_UPS,
  MAX_ECG_IMAGES,
  describeEcgMessage,
  ecgChipLabel,
  formatEcgBytes,
  resolveEcgWorkspaceLayout,
} from "@/lib/ecgInterpreter";

/** Traçado escolhido pelo médico e ainda não enviado (preview local via object URL). */
export interface EcgPendingImage {
  id: string;
  previewUrl: string;
  name: string;
  size: number;
}

/** Traçado já persistido na conversa (URL assinada do bucket privado; null enquanto carrega). */
export interface EcgResolvedImage {
  id: string;
  url: string | null;
  name: string;
  /** true quando a URL assinada não pôde ser obtida (evidência removida/expirada). */
  failed?: boolean;
}

export interface EcgChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  pending?: boolean;
  metadata?: unknown;
  attachments?: { name: string; previewUrl?: string }[];
}

export interface EcgInterpreterWorkspaceProps {
  isMobile: boolean;
  conversationName?: string | null;
  messages: EcgChatMessage[];
  pending: EcgPendingImage[];
  historical: EcgResolvedImage[];
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onQuickAsk: (text: string) => void;
  canSend: boolean;
  isLoading: boolean;
  onPickFiles: () => void;
  onRemovePending: (id: string) => void;
  onExit: () => void;
  onNewConversation: () => void;
  onOpenHistory: () => void;
  onCopy: (text: string, id: string) => void;
  copiedMessageId: string | null;
  onRead: (message: EcgChatMessage) => void;
  textareaRef?: RefObject<HTMLTextAreaElement>;
  messagesEndRef?: RefObject<HTMLDivElement>;
}

interface ViewerImage {
  key: string;
  url: string | null;
  name: string;
  size?: number;
  pending: boolean;
  removable: boolean;
  failed?: boolean;
}

const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;

/* -------------------------------------------------------------------------- */
/* Cabeçalho compacto                                                          */
/* -------------------------------------------------------------------------- */

function EcgHeader({
  conversationName,
  onExit,
  onNewConversation,
  onOpenHistory,
}: Pick<EcgInterpreterWorkspaceProps, "conversationName" | "onExit" | "onNewConversation" | "onOpenHistory">) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-border/40" data-testid="ecg-header">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-semibold leading-tight tracking-tight">Interpretador de ECG</h2>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate">
            {conversationName ? conversationName : "Envie o traçado original. Contexto clínico é opcional."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenHistory} title="Histórico de interpretações">
          <History className="h-4 w-4" />
          <span className="sr-only">Histórico</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewConversation} title="Nova interpretação">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Nova interpretação</span>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onExit} title="Voltar ao Clínicus" data-testid="ecg-exit">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sair do Interpretador</span>
          <span className="sm:hidden">Sair</span>
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dropzone                                                                    */
/* -------------------------------------------------------------------------- */

function EcgDropzone({ onPickFiles, compact = false }: { onPickFiles: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPickFiles}
      data-testid="ecg-dropzone"
      className={`group w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.03] text-center transition-colors hover:border-primary/60 hover:bg-primary/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        compact ? "px-4 py-8" : "px-6 py-12 md:py-16"
      }`}
    >
      <span
        className={`mx-auto mb-4 flex items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105 ${
          compact ? "h-12 w-12" : "h-16 w-16 md:h-20 md:w-20"
        }`}
      >
        <Upload className={compact ? "h-6 w-6" : "h-8 w-8 md:h-9 md:w-9"} aria-hidden />
      </span>
      <span className={`block font-medium tracking-tight ${compact ? "text-sm" : "text-base md:text-lg"}`}>
        Arraste ou selecione um ECG
      </span>
      <span className="mt-1 block text-xs md:text-sm text-muted-foreground">JPEG, PNG ou WebP · até {MAX_ECG_IMAGES} traçados · 10 MB cada</span>
      {!compact && (
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm">
          <Plus className="h-4 w-4" aria-hidden />
          Selecionar ECG
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Visualizador                                                                */
/* -------------------------------------------------------------------------- */

function EcgViewer({
  images,
  isMobile,
  onPickFiles,
  onRemovePending,
  canAddMore,
}: {
  images: ViewerImage[];
  isMobile: boolean;
  onPickFiles: () => void;
  onRemovePending: (id: string) => void;
  canAddMore: boolean;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Sempre que a lista mudar, foca o traçado mais recente e volta ao zoom padrão.
  const lastKey = images.length > 0 ? images[images.length - 1].key : null;
  useEffect(() => {
    setSelectedKey(lastKey);
    setZoomIdx(0);
  }, [lastKey]);

  const selected = images.find((img) => img.key === selectedKey) ?? images[images.length - 1] ?? null;
  const selectedIndex = selected ? images.findIndex((img) => img.key === selected.key) : -1;
  const zoom = ZOOM_LEVELS[zoomIdx];

  if (images.length === 0) return null;

  const mainImage = selected?.url ? (
    <img
      src={selected.url}
      alt={`ECG ${selectedIndex + 1}${selected.name ? ` — ${selected.name}` : ""}`}
      draggable={false}
      className={zoom === 1 ? "max-h-full max-w-full object-contain select-none" : "select-none"}
      style={zoom === 1 ? undefined : { width: `${zoom * 100}%`, maxWidth: "none", height: "auto" }}
    />
  ) : selected?.failed ? (
    <div className="flex flex-col items-center gap-2 px-6 text-center text-muted-foreground">
      <Activity className="h-6 w-6 opacity-40" />
      <span className="text-xs">Não foi possível carregar este traçado. Anexe o ECG novamente para continuar.</span>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-xs">Carregando traçado…</span>
    </div>
  );

  const zoomControls = (
    <div className="flex items-center gap-1 rounded-full bg-background/90 backdrop-blur px-1 py-0.5 shadow-sm border border-border/60">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
        disabled={zoomIdx === 0}
        title="Reduzir"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        disabled={zoomIdx === ZOOM_LEVELS.length - 1}
        title="Ampliar"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(true)} title="Tela cheia" disabled={!selected?.url}>
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const caption = selected && (
    <div className="flex items-center justify-between gap-2 text-[11px] md:text-xs text-muted-foreground">
      <span className="truncate">
        ECG {selectedIndex + 1} de {images.length}
        {selected.name ? ` · ${selected.name}` : ""}
        {typeof selected.size === "number" ? ` · ${formatEcgBytes(selected.size)}` : ""}
        {selected.pending ? " · aguardando envio" : ""}
      </span>
      {selected.removable && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
          onClick={() => onRemovePending(selected.key)}
          title="Remover este traçado antes de enviar"
        >
          <X className="mr-1 h-3 w-3" />
          Remover
        </Button>
      )}
    </div>
  );

  const thumbnails = images.length > 1 && (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5" aria-label="Traçados anexados">
      {images.map((img, idx) => (
        <button
          key={img.key}
          type="button"
          onClick={() => setSelectedKey(img.key)}
          className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/30 transition-all ${
            img.key === selected?.key ? "border-primary ring-2 ring-primary/30" : "border-border/60 hover:border-primary/50"
          }`}
          title={`ECG ${idx + 1}${img.name ? ` — ${img.name}` : ""}`}
        >
          {img.url ? (
            <img src={img.url} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </span>
          )}
          <span className="absolute bottom-0.5 left-0.5 rounded bg-background/85 px-1 text-[10px] font-medium leading-4">{idx + 1}</span>
          {img.pending && <span className="absolute right-0.5 top-0.5 rounded bg-primary px-1 text-[9px] font-semibold uppercase leading-4 text-primary-foreground">novo</span>}
        </button>
      ))}
    </div>
  );

  const addButton = (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      onClick={onPickFiles}
      disabled={!canAddMore}
      title={canAddMore ? "Adicionar outro traçado para comparação" : `Máximo de ${MAX_ECG_IMAGES} traçados por envio`}
      data-testid="ecg-add-more"
    >
      <Plus className="h-3.5 w-3.5" />
      Adicionar/Comparar ECG
    </Button>
  );

  const fullscreenDialog = (
    <Dialog open={fullscreen} onOpenChange={setFullscreen}>
      <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] p-2 sm:p-3 z-[90]">
        <DialogTitle className="sr-only">ECG em tela cheia</DialogTitle>
        <div className="h-full w-full overflow-auto flex items-center justify-center bg-muted/10 rounded-lg">
          {selected?.url && <img src={selected.url} alt={`ECG ${selectedIndex + 1} ampliado`} className="max-h-full max-w-full object-contain" />}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <section className="mb-2 rounded-2xl border border-border/60 bg-card/60 shadow-sm" data-testid="ecg-viewer-mobile">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
          aria-expanded={!collapsed}
        >
          <span className="flex items-center gap-2 min-w-0">
            {collapsed && selected?.url && <img src={selected.url} alt="" className="h-8 w-12 rounded object-cover border border-border/60" />}
            <span className="text-xs font-medium truncate">
              {collapsed ? "Mostrar ECG" : `ECG${images.length > 1 ? ` (${images.length})` : ""}`}
            </span>
          </span>
          {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>
        {!collapsed && (
          <div className="px-2 pb-2 space-y-2 animate-fade-in">
            <div className="relative h-[38vh] min-h-[200px] overflow-auto rounded-xl bg-muted/20 border border-border/50">
              <div className={`min-h-full min-w-full flex items-center justify-center ${zoom === 1 ? "h-full" : "p-1"}`}>{mainImage}</div>
              <div className="absolute right-2 top-2">{zoomControls}</div>
            </div>
            {caption}
            {thumbnails}
            <div className="flex items-center justify-between gap-2">{addButton}</div>
          </div>
        )}
        {fullscreenDialog}
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2.5" data-testid="ecg-viewer-desktop">
      <div className="relative flex-1 min-h-[320px] overflow-auto rounded-2xl border border-border/50 bg-muted/20">
        <div className={`min-h-full min-w-full flex items-center justify-center ${zoom === 1 ? "h-full p-2" : "p-2"}`}>{mainImage}</div>
        <div className="absolute right-3 top-3">{zoomControls}</div>
      </div>
      {caption}
      {thumbnails}
      <div className="flex items-center justify-between gap-2">{addButton}</div>
      {fullscreenDialog}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversa                                                                    */
/* -------------------------------------------------------------------------- */

function EcgConversation({
  messages,
  isLoading,
  showFollowUps,
  onQuickAsk,
  onCopy,
  copiedMessageId,
  onRead,
  messagesEndRef,
  isMobile,
}: Pick<EcgInterpreterWorkspaceProps, "messages" | "isLoading" | "onQuickAsk" | "onCopy" | "copiedMessageId" | "onRead" | "messagesEndRef" | "isMobile"> & {
  showFollowUps: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center text-muted-foreground">
        <Activity className="mb-3 h-8 w-8 opacity-30" />
        <p className="text-sm font-medium text-foreground/80">Traçado pronto para interpretação</p>
        <p className="mt-1 max-w-xs text-xs">Envie sem texto para a leitura completa, ou acrescente o contexto clínico e a sua pergunta.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isMobile ? "px-1 py-2" : "px-1 py-2 pr-3"}`} data-testid="ecg-conversation">
      {messages.map((msg) => {
        const isThinking = msg.role === "assistant" && msg.id === "streaming-temp" && msg.content.trim() === "";
        const isStreaming = msg.role === "assistant" && msg.id === "streaming-temp" && !isThinking;
        const info = msg.role === "user" ? describeEcgMessage(msg.metadata) : null;
        const previews = (msg.attachments ?? []).filter((a) => !!a.previewUrl);
        return (
          <div key={msg.id} className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`relative group rounded-2xl ${
                msg.role === "user"
                  ? "max-w-[90%] md:max-w-[80%] bg-primary text-primary-foreground px-3 py-2 md:px-4 md:py-3"
                  : isThinking
                    ? "max-w-[96%] bg-muted/60 px-3 py-2"
                    : "max-w-[98%] md:max-w-[96%] bg-muted/25 border border-border/50 px-4 pt-4 pb-9 md:px-5 md:pt-5 md:pb-10"
              }`}
            >
              {msg.role === "assistant" ? (
                isThinking ? (
                  <ThinkingIndicator label="Lendo o traçado" />
                ) : (
                  <StructuredResponse content={msg.content} size="chat" trailing={isStreaming ? <StreamCursor /> : undefined} />
                )
              ) : (
                <>
                  {(info || previews.length > 0) && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {previews.map((a) => (
                        <img
                          key={a.previewUrl}
                          src={a.previewUrl}
                          alt={a.name}
                          loading="lazy"
                          className="h-14 w-20 rounded-lg object-cover border border-primary-foreground/30 bg-black/20"
                        />
                      ))}
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[11px] font-medium">
                        <Activity className="h-3 w-3" />
                        {info ? ecgChipLabel(info) : `${previews.length} ${previews.length === 1 ? "ECG anexado" : "ECGs anexados"}`}
                      </span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                </>
              )}

              <p className="mt-1 flex items-center gap-1 text-xs opacity-70">
                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {msg.role === "user" && msg.pending && (
                  <span className="ml-1 inline-flex items-baseline" aria-label="enviando">
                    <span className="animate-thinking-dot">.</span>
                    <span className="animate-thinking-dot [animation-delay:0.18s]">.</span>
                    <span className="animate-thinking-dot [animation-delay:0.36s]">.</span>
                  </span>
                )}
              </p>

              {msg.role === "assistant" && !isThinking && !isStreaming && (
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => onRead(msg)} className="h-7 gap-1.5 px-2 text-xs" title="Abrir em leitura ampliada">
                    <BookOpen className="h-3 w-3" />
                    <span className="hidden md:inline">Ler</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onCopy(msg.content, msg.id)} className="h-7 gap-1.5 px-2 text-xs" title="Copiar texto">
                    {copiedMessageId === msg.id ? (
                      <>
                        <Check className="h-3 w-3 text-primary" />
                        <span className="hidden text-primary md:inline">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span className="hidden md:inline">Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {showFollowUps && !isLoading && (
        <div className="flex flex-wrap gap-1.5 pt-1 animate-fade-in" aria-label="Sugestões de seguimento" data-testid="ecg-follow-ups">
          {ECG_FOLLOW_UPS.map((label) => (
            <Button key={label} variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs font-normal" onClick={() => onQuickAsk(label)}>
              {label}
            </Button>
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer                                                                    */
/* -------------------------------------------------------------------------- */

function EcgComposer({
  message,
  onMessageChange,
  onSend,
  canSend,
  isLoading,
  onPickFiles,
  canAddMore,
  isMobile,
  textareaRef,
  hint,
}: Pick<EcgInterpreterWorkspaceProps, "message" | "onMessageChange" | "onSend" | "canSend" | "isLoading" | "onPickFiles" | "isMobile" | "textareaRef"> & {
  canAddMore: boolean;
  hint?: string;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMobile) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !isLoading) onSend();
    }
  };

  return (
    <div
      className={`border-t border-border/40 pt-2.5 md:pt-3 bg-background ${isMobile ? "sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]" : ""}`}
      data-testid="ecg-composer"
    >
      <div className="flex items-end gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={onPickFiles}
          disabled={!canAddMore || isLoading}
          title={canAddMore ? "Adicionar ECG" : `Máximo de ${MAX_ECG_IMAGES} traçados por envio`}
          aria-label="Adicionar ECG"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Contexto clínico ou pergunta sobre o ECG (opcional)"
          maxLength={10000}
          rows={isMobile ? 1 : 2}
          className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl text-sm md:text-base"
          data-testid="ecg-composer-input"
        />
        <Button
          onClick={onSend}
          disabled={!canSend || isLoading}
          className="h-11 shrink-0 gap-1.5 rounded-xl px-3 md:px-4"
          title={canSend ? "Enviar para interpretação" : "Anexe um ECG para enviar"}
          data-testid="ecg-send"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className={isMobile ? "sr-only" : ""}>Enviar</span>
        </Button>
      </div>
      {hint && !isMobile && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Workspace                                                                   */
/* -------------------------------------------------------------------------- */

export function EcgInterpreterWorkspace(props: EcgInterpreterWorkspaceProps) {
  const { isMobile, messages, pending, historical, isLoading } = props;

  const layout = resolveEcgWorkspaceLayout({
    pendingCount: pending.length,
    historicalCount: historical.length,
    messageCount: messages.length,
  });

  const images = useMemo<ViewerImage[]>(
    () => [
      ...historical.map((h) => ({ key: h.id, url: h.url, name: h.name, pending: false, removable: false, failed: h.failed })),
      ...pending.map((p) => ({ key: p.id, url: p.previewUrl, name: p.name, size: p.size, pending: true, removable: true })),
    ],
    [historical, pending],
  );

  const canAddMore = pending.length < MAX_ECG_IMAGES;
  const lastMessage = messages[messages.length - 1];
  const showFollowUps = Boolean(lastMessage && lastMessage.role === "assistant" && lastMessage.id !== "streaming-temp" && historical.length > 0);
  const hint = pending.length > 0
    ? "Enter envia · Shift+Enter quebra linha · o traçado será analisado na íntegra"
    : historical.length > 0
      ? "Enter envia · a pergunta usa o mesmo ECG já anexado"
      : "Anexe o ECG para habilitar o envio";

  const composer = (
    <EcgComposer
      message={props.message}
      onMessageChange={props.onMessageChange}
      onSend={props.onSend}
      canSend={props.canSend}
      isLoading={isLoading}
      onPickFiles={props.onPickFiles}
      canAddMore={canAddMore}
      isMobile={isMobile}
      textareaRef={props.textareaRef}
      hint={hint}
    />
  );

  const conversation = (
    <EcgConversation
      messages={messages}
      isLoading={isLoading}
      showFollowUps={showFollowUps}
      onQuickAsk={props.onQuickAsk}
      onCopy={props.onCopy}
      copiedMessageId={props.copiedMessageId}
      onRead={props.onRead}
      messagesEndRef={props.messagesEndRef}
      isMobile={isMobile}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col animate-fade-in" data-testid="ecg-workspace" data-layout={layout}>
      <EcgHeader
        conversationName={props.conversationName}
        onExit={props.onExit}
        onNewConversation={props.onNewConversation}
        onOpenHistory={props.onOpenHistory}
      />

      {layout === "empty" ? (
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="flex flex-1 items-center justify-center px-1 py-4 md:px-6">
            <div className="w-full max-w-2xl">
              <EcgDropzone onPickFiles={props.onPickFiles} />
            </div>
          </div>
          {composer}
        </div>
      ) : isMobile ? (
        <div className="flex flex-1 min-h-0 flex-col">
          {images.length > 0 ? (
            <EcgViewer images={images} isMobile onPickFiles={props.onPickFiles} onRemovePending={props.onRemovePending} canAddMore={canAddMore} />
          ) : (
            <div className="mb-2">
              <EcgDropzone onPickFiles={props.onPickFiles} compact />
            </div>
          )}
          <ScrollArea className="flex-1 min-h-0">{conversation}</ScrollArea>
          {composer}
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-[42fr_58fr] gap-5" data-testid="ecg-two-panels">
          <aside className="min-h-0 flex flex-col">
            {images.length > 0 ? (
              <EcgViewer images={images} isMobile={false} onPickFiles={props.onPickFiles} onRemovePending={props.onRemovePending} canAddMore={canAddMore} />
            ) : (
              <div className="flex h-full items-center">
                <EcgDropzone onPickFiles={props.onPickFiles} compact />
              </div>
            )}
          </aside>
          <section className="min-h-0 flex flex-col">
            <ScrollArea className="flex-1 min-h-0">{conversation}</ScrollArea>
            {composer}
          </section>
        </div>
      )}
    </div>
  );
}

export default EcgInterpreterWorkspace;
