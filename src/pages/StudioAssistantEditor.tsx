import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ArrowLeft, Check, FlaskConical, Library, Loader2, Maximize2, Minimize2, MessageSquarePlus, MoreHorizontal, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DEFAULT_STUDIO_MODEL, STUDIO_MODELS, createThread, deleteAssistant, saveAssistant, useStudioStore, type StudioModelId,
} from "@/lib/studio";
import { MAX_ASSISTANT_INSTRUCTIONS, MAX_ASSISTANT_NAME } from "@/lib/studioBuilder";
import { CoachPanel } from "@/components/studio/editor/CoachPanel";
import { TestPanel } from "@/components/studio/editor/TestPanel";

type Side = "aprimorar" | "testar";
type MobileTab = "prompt" | Side;
const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Página de criar/editar assistente próprio do Studio: editor amplo + IA consultora + teste. */
export default function StudioAssistantEditor() {
  const { assistantId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { enabled, assistants, loaded } = useStudioStore();
  const [savedId, setSavedId] = useState<string | undefined>(assistantId);
  const [name, setName] = useState("");
  const [model, setModel] = useState<StudioModelId>(DEFAULT_STUDIO_MODEL);
  const [instructions, setInstructions] = useState("");
  const [snapshot, setSnapshot] = useState({ name: "", model: DEFAULT_STUDIO_MODEL as StudioModelId, instructions: "" });
  const [ready, setReady] = useState(!assistantId);
  const [side, setSide] = useState<Side>("aprimorar");
  const [mobileTab, setMobileTab] = useState<MobileTab>("prompt");
  const [wide, setWide] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const sidePanel = useRef<ImperativePanelHandle>(null);

  // Abre um assistente existente quando a lista da conta chegar.
  useEffect(() => {
    if (!assistantId || ready) return;
    const a = assistants.find((x) => x.id === assistantId);
    if (a) {
      setName(a.name); setModel(a.model); setInstructions(a.instructions);
      setSnapshot({ name: a.name, model: a.model, instructions: a.instructions });
      setReady(true);
    } else if (loaded) {
      toast.error("Assistente não encontrado.");
      navigate("/studio", { replace: true });
    }
  }, [assistantId, assistants, loaded, ready, navigate]);

  const dirty = name !== snapshot.name || model !== snapshot.model || instructions !== snapshot.instructions;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-20 text-center">
        <h1 className="text-xl font-semibold">Studio está desligado</h1>
        <p className="text-sm text-muted-foreground">Ligue a chave "Studio (Beta)" no topo da barra lateral para usar.</p>
      </div>
    );
  }
  if (!ready) {
    return <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo assistente...</div>;
  }

  const focusEditor = () => { if (isMobile) setMobileTab("prompt"); setTimeout(() => editorRef.current?.focus(), 50); };

  const save = () => {
    if (!name.trim()) { toast.error("Dê um nome ao assistente."); if (isMobile) setMobileTab("prompt"); nameRef.current?.focus(); return null; }
    if (!instructions.trim()) { toast.error("Escreva ou cole as instruções."); focusEditor(); return null; }
    const saved = saveAssistant({ id: savedId, name: name.trim(), instructions: instructions.trim(), model });
    setName(saved.name); setInstructions(saved.instructions);
    setSnapshot({ name: saved.name, model: saved.model, instructions: saved.instructions });
    if (!savedId) { setSavedId(saved.id); navigate(`/studio/assistente/${saved.id}`, { replace: true }); }
    return saved;
  };
  const saveOnly = () => { if (save()) toast.success("Assistente salvo."); };
  const saveAndUse = () => { const s = save(); if (s) navigate(`/studio/${createThread(s).id}`); };
  const leave = () => { if (dirty && !window.confirm("Sair sem salvar as mudanças?")) return; navigate(-1); };
  const openTest = () => { if (isMobile) setMobileTab("testar"); else { setSide("testar"); if (wide) toggleWide(); } };
  const toggleWide = () => {
    const p = sidePanel.current;
    if (!p) return;
    if (p.isCollapsed()) { p.expand(); setWide(false); } else { p.collapse(); setWide(true); }
  };
  const applyVersion = (text: string, suggested?: string) => {
    setInstructions(text.slice(0, MAX_ASSISTANT_INSTRUCTIONS));
    if (suggested && !name.trim()) setName(suggested.slice(0, MAX_ASSISTANT_NAME));
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const next = instructions.length - (el.selectionEnd - el.selectionStart) + e.clipboardData.getData("text").length;
    if (next > MAX_ASSISTANT_INSTRUCTIONS) toast.warning(`O texto colado passou de ${fmt(MAX_ASSISTANT_INSTRUCTIONS)} caracteres. Só entrou até esse limite; confira o final.`);
  };

  const full = instructions.length >= MAX_ASSISTANT_INSTRUCTIONS;
  const editor = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="label-mono">Instruções do assistente</span>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 font-mono text-2xs tabular-nums", full ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
          {fmt(instructions.length)} / {fmt(MAX_ASSISTANT_INSTRUCTIONS)}
        </span>
        {!isMobile && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleWide} aria-label={wide ? "Mostrar painel da IA" : "Editor em tela cheia"} title={wide ? "Mostrar painel da IA" : "Editor em tela cheia"}>
            {wide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
      <Textarea ref={editorRef} value={instructions} maxLength={MAX_ASSISTANT_INSTRUCTIONS} onPaste={onPaste}
        onChange={(e) => setInstructions(e.target.value)} spellCheck
        placeholder={"Cole aqui o seu prompt (pode ser um feito no ChatGPT) ou escreva como o assistente deve responder:\n\nPAPEL E OBJETIVO\nO QUE VOU ENVIAR\nFORMATO DA RESPOSTA\nO QUE NUNCA FAZER"}
        className="flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed shadow-none focus-visible:ring-0" />
    </div>
  );

  const sideTabs = (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
      {([["aprimorar", "Aprimorar com a IA", Wand2], ["testar", "Testar", FlaskConical]] as const).map(([k, label, Icon]) => (
        <button key={k} type="button" onClick={() => setSide(k)}
          className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            side === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );

  const coach = (
    <CoachPanel name={name} model={model} instructions={instructions} onApply={applyVersion}
      onFocusEditor={focusEditor} onSaveAndUse={saveAndUse} onOpenTest={openTest} />
  );
  const test = <TestPanel model={model} instructions={instructions} name={name} />;
  const showAprimorar = isMobile ? mobileTab === "aprimorar" : side === "aprimorar";
  const showTestar = isMobile ? mobileTab === "testar" : side === "testar";
  // Os painéis ficam montados (só escondidos) para a conversa não se perder ao trocar de aba.
  const panels = (
    <>
      <div className={cn("min-h-0 flex-1", !showAprimorar && "hidden")}>{coach}</div>
      <div className={cn("min-h-0 flex-1", !showTestar && "hidden")}>{test}</div>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={leave} aria-label="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
        <Input ref={nameRef} value={name} maxLength={MAX_ASSISTANT_NAME} onChange={(e) => setName(e.target.value)}
          placeholder="Nome do assistente (ex.: Parecer de risco cirúrgico)" aria-label="Nome do assistente"
          className="h-10 min-w-0 flex-1 basis-56 border-transparent bg-transparent px-2 text-base font-semibold shadow-none hover:border-border focus-visible:border-border" />
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Select value={model} onValueChange={(v) => setModel(v as StudioModelId)}>
            <SelectTrigger className="h-9 flex-1 md:w-[190px] md:flex-none" aria-label="IA do assistente"><SelectValue /></SelectTrigger>
            <SelectContent>{STUDIO_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <span className={cn("hidden text-2xs lg:inline", dirty ? "text-muted-foreground" : "text-primary")} aria-live="polite">
            {dirty ? "Alterações não salvas" : savedId ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Salvo</span> : ""}
          </span>
          <Button variant="outline" className="h-9" onClick={saveOnly} disabled={savedId ? !dirty : false}>Salvar</Button>
          <Button className="h-9 gap-1.5" onClick={saveAndUse}><MessageSquarePlus className="h-4 w-4" /> <span className="hidden sm:inline">Salvar e usar</span><span className="sm:hidden">Usar</span></Button>
          {savedId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais opções"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => { if (dirty && !window.confirm("Publicar a versão salva? As mudanças não salvas ficam de fora.")) return; navigate(`/prompteca?publicar=${savedId}`); }}>
                  <Library className="h-4 w-4" /> Publicar na Prompteca
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"
                  onSelect={() => { if (!window.confirm("Excluir este assistente?")) return; deleteAssistant(savedId); navigate("/studio", { replace: true }); }}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-3 gap-1 border-b border-border p-1.5">
            {([["prompt", "Prompt"], ["aprimorar", "Aprimorar"], ["testar", "Testar"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMobileTab(k)}
                className={cn("rounded-md py-1.5 text-xs font-medium", mobileTab === k ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{label}</button>
            ))}
          </div>
          <div className={cn("min-h-0 flex-1", mobileTab !== "prompt" && "hidden")}>{editor}</div>
          {panels}
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" autoSaveId="studio-assistant-editor" className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
          <ResizablePanel defaultSize={56} minSize={30}>{editor}</ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel ref={sidePanel} defaultSize={44} minSize={28} collapsible collapsedSize={0}
            onCollapse={() => setWide(true)} onExpand={() => setWide(false)} className="flex flex-col bg-background/60">
            {sideTabs}
            {panels}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
