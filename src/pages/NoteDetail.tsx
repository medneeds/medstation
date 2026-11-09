import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  History,
  Clock,
  RotateCcw,
  Copy,
  Check,
  MoreHorizontal,
  CaseUpper,
  Eraser,
  Rows3,
  SpellCheck,
  Undo2,
  Gauge,
  Loader2,
  CloudOff,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyToRange,
  CHAR_LIMIT_STORAGE_KEY,
  collapseBlankLines,
  countWords,
  LIMIT_PRESETS,
  limitStatus,
  MAX_NOTE_CHARS,
  parseCharLimit,
  removeSpecialChars,
  toUpperPtBr,
  type LimitStatus,
} from "@/lib/noteTools";

interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteVersion {
  id: string;
  title: string;
  content: string;
  version_number: number;
  created_at: string;
}

type SaveState = "saved" | "dirty" | "saving" | "error";

const normTitle = (t: string) => t.trim() || "Sem título";
const fmt = (n: number) => n.toLocaleString("pt-BR");
const timeOf = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_TEXT: Record<LimitStatus, string> = {
  none: "text-foreground",
  ok: "text-primary",
  near: "text-warning",
  over: "text-destructive",
};
const STATUS_BAR: Record<LimitStatus, string> = {
  none: "bg-primary",
  ok: "bg-primary",
  near: "bg-warning",
  over: "bg-destructive",
};

function readLimit(): number | null {
  try {
    return parseCharLimit(localStorage.getItem(CHAR_LIMIT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Character counter with the doctor's chosen limit; `compact` is the phone bottom-bar version. */
function CharCounter({ length, words, limit, compact }: { length: number; words: number; limit: number | null; compact?: boolean }) {
  const status = limitStatus(length, limit);
  const pct = limit ? Math.min(100, (length / limit) * 100) : 0;
  return (
    <div className={cn("min-w-0", compact ? "flex-1" : "w-44")} aria-live="polite" title="Contagem em tempo real">
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className={cn("font-semibold leading-none", compact ? "text-xl" : "text-2xl", STATUS_TEXT[status])}>
          {fmt(length)}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {limit ? `de ${fmt(limit)}` : "caracteres"}
        </span>
      </div>
      {limit ? (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", STATUS_BAR[status])} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <p className={cn("mt-1 text-2xs tabular-nums", status === "over" ? "text-destructive font-medium" : "text-muted-foreground")}>
        {status === "over" ? `${fmt(length - (limit ?? 0))} acima do limite` : `${fmt(words)} palavras`}
      </p>
    </div>
  );
}

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  // Only same-app paths are accepted as the return target.
  const rawBack = searchParams.get("voltar");
  const backTo = rawBack && rawBack.startsWith("/") && !rawBack.startsWith("//") ? rawBack : null;
  const backLabel = backTo?.startsWith("/clinicus") ? "Voltar ao Clínicus" : backTo ? "Voltar ao assistente" : "Notas";

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [limit, setLimit] = useState<number | null>(readLimit);
  const [customLimit, setCustomLimit] = useState("");
  const [limitOpen, setLimitOpen] = useState(false);
  const [undo, setUndo] = useState<{ content: string; label: string } | null>(null);
  const [spelling, setSpelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<number | null>(null);
  // Last values confirmed in the database; edits are compared against these.
  const savedRef = useRef<{ title: string; content: string } | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          toast({ title: "Nota não encontrada", variant: "destructive" });
          navigate("/notes");
          return;
        }
        setNote(data);
        setTitle(data.title);
        setContent(data.content);
        savedRef.current = { title: data.title, content: data.content };
        setSavedAt(new Date(data.updated_at));
      } catch (error: any) {
        toast({ title: "Erro ao carregar nota", description: error.message, variant: "destructive" });
        navigate("/notes");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const latestRef = useRef({ title, content });
  latestRef.current = { title, content };
  const differsFromSaved = (t: string, c: string) =>
    !!savedRef.current && (normTitle(t) !== savedRef.current.title || c !== savedRef.current.content);
  const isDirty = differsFromSaved(title, content);

  /** Saves silently; returns false on failure. */
  const saveNote = useCallback(async (): Promise<boolean> => {
    if (!note || savingRef.current) return true;
    const snapshot = { title: normTitle(title), content };
    if (savedRef.current && snapshot.title === savedRef.current.title && snapshot.content === savedRef.current.content) {
      setSaveState("saved");
      return true;
    }
    if (snapshot.title.length > 200 || snapshot.content.length > MAX_NOTE_CHARS) {
      setSaveState("error");
      toast({ title: "Texto muito longo", description: `O limite da nota é ${fmt(MAX_NOTE_CHARS)} caracteres.`, variant: "destructive" });
      return false;
    }
    savingRef.current = true;
    setSaveState("saving");
    const { error } = await supabase.from("notes").update(snapshot).eq("id", note.id);
    savingRef.current = false;
    if (error) {
      setSaveState("error");
      return false;
    }
    savedRef.current = { title: snapshot.title, content: snapshot.content };
    setSavedAt(new Date());
    // If the doctor kept typing while saving, the next autosave picks it up.
    const latest = latestRef.current;
    setSaveState(differsFromSaved(latest.title, latest.content) ? "dirty" : "saved");
    return true;
  }, [note, title, content, toast]);

  // Silent autosave 3 s after the last edit.
  useEffect(() => {
    if (saveState !== "dirty") return;
    const t = setTimeout(() => void saveNote(), 3000);
    return () => clearTimeout(t);
  }, [saveState, title, content, saveNote]);

  // Ctrl/Cmd+S saves right away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNote();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNote]);

  const changeContent = (value: string) => {
    setContent(value);
    if (savedRef.current && !savingRef.current) setSaveState(differsFromSaved(title, value) ? "dirty" : "saved");
  };
  const changeTitle = (value: string) => {
    setTitle(value);
    if (savedRef.current && !savingRef.current) setSaveState(differsFromSaved(value, content) ? "dirty" : "saved");
  };

  const goBack = async () => {
    if (isDirty) await saveNote();
    navigate(backTo ?? "/notes");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  /** Runs a quick tool on the selection (or the whole text) and offers "Desfazer". */
  const runTool = (label: string, transform: (part: string) => string, needsSelection = false) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    if (needsSelection && start === end) {
      toast({ description: "Selecione o trecho que quer deixar em MAIÚSCULAS." });
      return;
    }
    const result = applyToRange(content, start, end, transform);
    if (result.text === content) {
      toast({ description: "Nada para alterar." });
      return;
    }
    setUndo({ content, label });
    changeContent(result.text);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      if (result.selectionEnd > result.selectionStart) el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const correctSpelling = async () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const part = start === end ? content : content.slice(start, end);
    if (!part.trim()) return;
    setSpelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("note-spellcheck", { body: { text: part } });
      if (error) {
        let msg = "Não foi possível corrigir agora. Tente de novo.";
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch { /* keep default */ }
        throw new Error(msg);
      }
      if (data?.rejected) {
        toast({ description: "A correção mudaria mais que a ortografia, então mantive seu texto." });
        return;
      }
      if (!data?.changed) {
        toast({ description: "Nenhum erro de ortografia encontrado." });
        return;
      }
      runTool("Correção ortográfica", () => data.text);
    } catch (e: any) {
      toast({ title: "Correção indisponível", description: e.message, variant: "destructive" });
    } finally {
      setSpelling(false);
    }
  };

  const chooseLimit = (value: number | null) => {
    setLimit(value);
    try {
      if (value) localStorage.setItem(CHAR_LIMIT_STORAGE_KEY, String(value));
      else localStorage.removeItem(CHAR_LIMIT_STORAGE_KEY);
    } catch { /* private mode */ }
    setLimitOpen(false);
    setCustomLimit("");
  };

  const openHistory = async () => {
    setHistoryDialogOpen(true);
    const { data, error } = await supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", id)
      .order("version_number", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar histórico", description: error.message, variant: "destructive" });
      return;
    }
    setVersions(data || []);
  };

  const restoreVersion = async (version: NoteVersion) => {
    const { error } = await supabase
      .from("notes")
      .update({ title: version.title, content: version.content })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao restaurar versão", description: error.message, variant: "destructive" });
      return;
    }
    savedRef.current = { title: version.title, content: version.content };
    setTitle(version.title);
    setContent(version.content);
    setSaveState("saved");
    setSavedAt(new Date());
    setHistoryDialogOpen(false);
    toast({ description: `Versão ${version.version_number} restaurada.` });
  };

  // The workspace fills the screen below whatever sits above it (header, banners), so the
  // counter and Copiar stay in view while the text scrolls inside.
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const bottomGap = window.innerWidth >= 1024 ? 32 : window.innerWidth >= 768 ? 24 : 16;
      setShellHeight(Math.max(440, window.innerHeight - top - bottomGap));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    const main = el.closest("main");
    if (main) ro.observe(main);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando nota...</p>
        </div>
      </div>
    );
  }

  if (!note) return null;

  const words = countWords(content);

  const saveLabel =
    saveState === "saving" ? "Salvando..." :
    saveState === "dirty" ? "Alterações não salvas" :
    saveState === "error" ? "Não salvou" :
    savedAt ? `Salvo às ${timeOf(savedAt)}` : "Salvo";

  const toolBtn = "h-9 shrink-0 gap-1.5 px-2.5 text-xs md:h-8";

  return (
    <div
      ref={shellRef}
      style={shellHeight ? { height: shellHeight } : undefined}
      className="mx-auto flex h-[calc(100dvh-5.5rem)] min-h-[440px] w-full max-w-6xl flex-col md:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-7.5rem)]"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-border px-2 py-2 md:gap-4 md:px-4 md:py-3">
          <Button variant="ghost" size="sm" onClick={goBack} className="h-10 shrink-0 gap-1.5 px-2 md:h-9" title={backLabel}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>

          <div className="min-w-0 flex-1">
            <Input
              value={title}
              onChange={(e) => changeTitle(e.target.value)}
              placeholder="Título da nota"
              maxLength={200}
              aria-label="Título da nota"
              className="h-8 border-none bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:ring-1 md:text-base"
            />
            <button
              type="button"
              onClick={() => (saveState === "error" || saveState === "dirty") && void saveNote()}
              className={cn(
                "flex items-center gap-1 px-1 text-2xs",
                saveState === "error" ? "text-destructive" : "text-muted-foreground",
                (saveState === "error" || saveState === "dirty") && "hover:text-foreground",
              )}
              title={saveState === "error" ? "Tentar salvar de novo" : saveState === "dirty" ? "Salvar agora (Ctrl+S)" : undefined}
            >
              {saveState === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> :
                saveState === "error" ? <CloudOff className="h-3 w-3" /> :
                saveState === "dirty" ? <span className="h-1.5 w-1.5 rounded-full bg-warning" /> :
                <Check className="h-3 w-3 text-primary" />}
              <span>{saveLabel}{saveState === "error" ? " · tentar de novo" : ""}</span>
            </button>
          </div>

          <div className="hidden md:block">
            <CharCounter length={content.length} words={words} limit={limit} />
          </div>

          <Button onClick={copyText} size="sm" className="hidden h-9 gap-1.5 md:inline-flex" title="Copiar texto para o prontuário">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 md:h-9 md:w-9" aria-label="Mais opções">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void saveNote()} disabled={!isDirty}>
                <Save className="mr-2 h-4 w-4" /> Salvar agora
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openHistory}>
                <History className="mr-2 h-4 w-4" /> Histórico de versões
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick tools */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1.5 md:px-4 [scrollbar-width:none]">
          <Button variant="ghost" size="sm" className={toolBtn} onClick={() => runTool("MAIÚSCULAS", toUpperPtBr, true)} title="Deixar o trecho selecionado em MAIÚSCULAS">
            <CaseUpper className="h-4 w-4" /> MAIÚSCULAS
          </Button>
          <Button variant="ghost" size="sm" className={toolBtn} onClick={() => runTool("Remover símbolos", removeSpecialChars)} title="Remove asteriscos, #, emojis e símbolos decorativos">
            <Eraser className="h-4 w-4" /> Remover símbolos
          </Button>
          <Button variant="ghost" size="sm" className={toolBtn} onClick={() => runTool("Limpar linhas", collapseBlankLines)} title="Deixa no máximo uma linha em branco entre blocos">
            <Rows3 className="h-4 w-4" /> Limpar linhas
          </Button>
          <Button variant="ghost" size="sm" className={toolBtn} onClick={correctSpelling} disabled={spelling} title="Corrige ortografia e acentos sem mudar números, doses ou siglas">
            {spelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <SpellCheck className="h-4 w-4" />}
            {spelling ? "Corrigindo..." : "Corrigir ortografia"}
          </Button>
          {undo && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(toolBtn, "text-primary")}
              onClick={() => {
                changeContent(undo.content);
                setUndo(null);
              }}
              title={`Desfazer: ${undo.label}`}
            >
              <Undo2 className="h-4 w-4" /> Desfazer
            </Button>
          )}

          <div className="ml-auto pl-2">
            <Popover open={limitOpen} onOpenChange={setLimitOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(toolBtn, "bg-background")}>
                  <Gauge className="h-4 w-4" />
                  {limit ? `Limite ${fmt(limit)}` : "Definir limite"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-3">
                <div>
                  <p className="text-sm font-medium">Limite de caracteres</p>
                  <p className="text-xs text-muted-foreground">Ex.: o limite do campo do prontuário. Fica salvo neste aparelho.</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {LIMIT_PRESETS.map((p) => (
                    <Button key={p} variant={limit === p ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => chooseLimit(p)}>
                      {fmt(p)}
                    </Button>
                  ))}
                  <Button variant={limit ? "ghost" : "secondary"} size="sm" className="h-8 text-xs" onClick={() => chooseLimit(null)}>
                    Sem limite
                  </Button>
                </div>
                <form
                  className="flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = parseCharLimit(customLimit);
                    if (v) chooseLimit(v);
                  }}
                >
                  <Input
                    inputMode="numeric"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value.replace(/\D/g, ""))}
                    placeholder="Outro valor"
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm" className="h-8" disabled={!parseCharLimit(customLimit)}>
                    OK
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Paper */}
        <div className="min-h-0 flex-1 overflow-hidden bg-background/60">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => changeContent(e.target.value)}
            placeholder="Comece a escrever..."
            maxLength={MAX_NOTE_CHARS}
            spellCheck
            lang="pt-BR"
            aria-label="Texto da nota"
            className="mx-auto block h-full w-full max-w-4xl resize-none bg-transparent px-4 py-4 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground md:px-10 md:py-8"
          />
        </div>

        {/* Phone bottom bar */}
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 md:hidden">
          <CharCounter length={content.length} words={words} limit={limit} compact />
          <Button onClick={copyText} className="h-11 shrink-0 gap-1.5 px-5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de versões</DialogTitle>
            <DialogDescription>Veja e restaure versões anteriores desta nota</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] md:h-[500px] pr-2 md:pr-4">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma versão anterior</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {versions.map((version) => (
                  <Card key={version.id} className="overflow-hidden">
                    <CardHeader className="pb-2 md:pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm md:text-base truncate">{version.title || "Sem título"}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">Versão {version.version_number}</Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(version.created_at)}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => restoreVersion(version)} className="shrink-0 w-full sm:w-auto">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">{version.content || "Nota vazia"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
