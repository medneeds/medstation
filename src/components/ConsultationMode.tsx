import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  Copy,
  Save,
  MessageSquare,
  FileText,
  Loader2,
  Stethoscope,
  User,
  Users,
  Sparkles,
  Send,
  Columns2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { useConsultation } from "@/hooks/useConsultation";
import { TranscriptionPane } from "@/components/consultation/TranscriptionPane";
import { StructuredPane } from "@/components/consultation/StructuredPane";
import { FinalizeFlow, type FinalizePhase } from "@/components/consultation/FinalizeFlow";
import { useCaseFolders } from "@/hooks/useCaseFolders";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";
import { buildAnamnesisText, countFilledSections } from "@/lib/anamnesis";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConsultationModeProps {
  caseId?: string;
  onExit: () => void;
}

type FocusPane = "split" | "transcription" | "structure";

const CONSULTATION_SPECIALTIES = [
  "Clínica Médica",
  "Medicina de Emergência",
  "Medicina Intensiva",
  "Cardiologia",
  "Pneumologia",
  "Gastroenterologia",
  "Endocrinologia",
  "Nefrologia",
  "Neurologia",
  "Psiquiatria",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Ortopedia",
  "Dermatologia",
  "Infectologia",
  "Geriatria",
  "Reumatologia",
  "Urologia",
  "Oftalmologia",
  "Otorrinolaringologia",
  "Cirurgia Geral",
  "Medicina de Família",
];

export function ConsultationMode({ caseId, onExit }: ConsultationModeProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finalizePhase, setFinalizePhase] = useState<FinalizePhase>("review");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("transcription");
  const [caseName, setCaseName] = useState<string>("");
  const [caseFolderId, setCaseFolderId] = useState<string | null>(null);
  const [consultationDate, setConsultationDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const { folders, isCreating: isCreatingFolder, createFolder } = useCaseFolders();
  const [isSavingCase, setIsSavingCase] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);

  const [focusPane, setFocusPane] = useState<FocusPane>("split");
  const [unifiedMode, setUnifiedMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('consultorio-unified-mode') === '1';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('consultorio-unified-mode', unifiedMode ? '1' : '0');
    }
  }, [unifiedMode]);




  const {
    segments,
    partialTranscription,
    structure,
    isRecording,
    isPaused,
    isConnecting,
    isTranscribing,
    isStructuring,
    isFinalizing,
    formattedTime,
    currentSpeaker,
    audioLevel,
    error,
    changedFields,
    lastStructuredAt,
    smartSummary,
    isSummarizing,
    generateSummary,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    updateStructure,
    changeSpeaker,
    deleteSegment,
    updateStructureField,
    stopTimer,
    reset,
    setCurrentSpeaker,
    specialty,
    setSpecialty,
    detectedSpecialty,
  } = useConsultation({ caseId });


  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);





  // Keyboard shortcuts: 1=Médico, 2=Paciente, 3=Acompanhante (durante gravação)
  useEffect(() => {
    if (!isRecording || isPaused || unifiedMode) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === '1') { setCurrentSpeaker('doctor'); toast.success('Falando: Médico', { duration: 1200 }); }
      else if (e.key === '2') { setCurrentSpeaker('patient'); toast.success('Falando: Paciente', { duration: 1200 }); }
      else if (e.key === '3') { setCurrentSpeaker('companion'); toast.success('Falando: Acompanhante', { duration: 1200 }); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRecording, isPaused, unifiedMode, setCurrentSpeaker]);

  // Fluxo pós-gravação: revisar áudio -> estruturar anamnese -> salvar
  const runFinalizeFlow = useCallback(async (opts?: { alreadyStopped?: boolean }) => {
    setFinalizeError(null);
    setShowFinishDialog(true);
    try {
      setFinalizePhase('review');
      if (!opts?.alreadyStopped) await stopRecording();
      setFinalizePhase('structuring');
      await updateStructure();
      setActiveTab('structure');
      setFinalizePhase('done');
    } catch (e: any) {
      setFinalizeError(e?.message || null);
      setFinalizePhase('error');
    }
  }, [stopRecording, updateStructure]);

  const handleFinish = useCallback(() => { void runFinalizeFlow(); }, [runFinalizeFlow]);

  const handleGenerateStructure = useCallback(async () => {
    try {
      await updateStructure();
      toast.success('Pronto 👏 Sua anamnese está estruturada acima.');
      setActiveTab('structure');
      setShowFinishDialog(false);
    } catch {
      toast.error('Não foi possível gerar a estruturação agora');
    }
  }, [updateStructure]);

  const handleExit = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      stopTimer();
    }
    reset();
    onExit();
  }, [isRecording, stopRecording, stopTimer, reset, onExit]);

  const buildStructuredText = useCallback(() => buildAnamnesisText(structure), [structure]);

  const handleCopyToClipboard = useCallback(async () => {
    const text = buildStructuredText();
    if (!text) {
      toast.error('Gere a estruturação antes de copiar.');
      return;
    }
    const ok = await copyText(text);
    toast[ok ? 'success' : 'error'](
      ok ? 'Copiado 👏 Cole direto no prontuário.' : 'Não foi possível copiar. Selecione o texto e use Ctrl+C.'
    );
  }, [buildStructuredText]);

  const handleCopyTranscript = useCallback(async () => {
    const text = segments
      .map((s) => {
        const t = s.text.trim();
        if (!t) return '';
        if (unifiedMode) return t;
        const who = s.speaker === 'doctor' ? 'Médico' : s.speaker === 'patient' ? 'Paciente' : 'Acompanhante';
        return `${who}: ${t}`;
      })
      .filter(Boolean)
      .join('\n\n');
    if (!text) {
      toast.error('Ainda não há transcrição.');
      return;
    }
    const ok = await copyText(text);
    toast[ok ? 'success' : 'error'](ok ? 'Transcrição copiada 👏' : 'Não foi possível copiar.');
  }, [segments, unifiedMode]);

  const handleSendToAssistant = useCallback(
    (route: string) => {
      const text = buildStructuredText();
      if (!text) {
        toast.error('Gere a estruturação antes de enviar.');
        return;
      }
      sessionStorage.setItem('agent-prefill', text);
      toast.success('Consulta enviada para o assistente 👏');
      navigate(route);
    },
    [buildStructuredText, navigate]
  );


  const handleSaveCase = useCallback(async () => {
    const name = caseName.trim();
    if (!name) {
      toast.error('Dê um nome ao caso para salvar.');
      return;
    }
    setIsSavingCase(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada.');
      const notes = buildStructuredText();
      const { data, error: insertError } = await supabase
        .from('cases')
        .insert({
          user_id: user.id,
          title: name,
          chief_complaint: structure.chiefComplaint || null,
          notes: notes || null,
          status: 'active',
          folder_id: caseFolderId,
          consultation_date: consultationDate,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      setSavedCaseId(data.id);
      const folderName = folders.find((f) => f.id === caseFolderId)?.name;
      toast.success(folderName ? `Caso salvo em "${folderName}" 👏` : 'Caso salvo 👏');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível salvar o caso.');
    } finally {
      setIsSavingCase(false);
    }
  }, [caseName, buildStructuredText, structure.chiefComplaint, caseFolderId, consultationDate, folders]);


  return (
    <div className="flex flex-col h-full bg-background">
      {/* Barra de comando única — identidade, modo, foco, tempo e controles */}
      <header className="relative shrink-0 border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-card/80 backdrop-blur-md pointer-events-none" />
        {isRecording && !isPaused && (
          <motion.div
            className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)" }}
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 px-2 md:px-4 py-2">
          {/* Identidade — apenas voltar, título já no cabeçalho superior */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleExit} className="h-9 w-9 md:h-8 md:w-8 rounded-xl shrink-0" title="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Centro: estado do áudio + seletores segmentados */}
          <div className={cn(
            "flex items-center gap-2 md:gap-3 flex-1 justify-center min-w-0 overflow-x-auto no-scrollbar",
            isMobile && "hidden"
          )}>

            {/* Estado do áudio — sempre visível, intencional mesmo ocioso */}
            <div className={cn(
              "hidden sm:flex shrink-0 items-center gap-2 h-8 px-2.5 rounded-xl border transition-colors",
              isRecording && !isPaused
                ? "bg-primary/10 border-primary/25"
                : "bg-muted/40 border-border/60"
            )}>
              <span className="flex items-center gap-[2.5px] h-4 overflow-hidden">
                {[0.45, 0.75, 1, 0.85, 0.6, 0.95, 0.5].map((factor, i) => {
                  const active = isRecording && !isPaused;
                  const h = active
                    ? Math.max(3, Math.min(14, 3 + audioLevel * 26 * factor))
                    : [5, 8, 5, 10, 6, 9, 5][i];
                  return (
                    <motion.span
                      key={i}
                      className={cn(
                        "w-[2px] rounded-full",
                        active ? "bg-primary" : isPaused ? "bg-muted-foreground/40" : "bg-primary/35"
                      )}
                      animate={{ height: h }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      style={{ height: h }}
                    />
                  );
                })}
              </span>
              <span className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                isRecording && !isPaused ? "text-primary" : "text-muted-foreground"
              )}>
                {isRecording ? (isPaused ? 'Pausado' : 'Ao vivo') : 'Pronto'}
              </span>
            </div>


            {/* Modo de transcrição — segmentado, estado ativo óbvio */}
            <div className="inline-flex shrink-0 p-1 rounded-xl bg-muted/60 border border-border/60">
              {([
                { key: false, label: 'Identificar falantes', short: 'Falantes', Icon: Users },
                { key: true, label: 'Transcrição contínua', short: 'Contínua', Icon: MessageSquare },
              ]).map(({ key, label, short, Icon }) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setUnifiedMode(key)}
                  aria-pressed={unifiedMode === key}
                  title={label}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                    unifiedMode === key
                      ? "bg-card text-primary shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline 2xl:hidden">{short}</span>
                  <span className="hidden 2xl:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Especialidade — automática por padrão */}
            <div className="hidden lg:flex shrink-0 items-center gap-1.5">
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger
                  className="h-8 w-[168px] rounded-xl bg-muted/60 border-border/60 text-[11px]"
                  title="Especialidade do atendimento"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent className="z-[80] max-h-72">
                  <SelectItem value="auto">Automático</SelectItem>
                  {CONSULTATION_SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {specialty === "auto" && detectedSpecialty && (
                <span className="text-[10px] text-primary/80 whitespace-nowrap max-w-[120px] truncate" title={detectedSpecialty}>
                  {detectedSpecialty}
                </span>
              )}
            </div>

            {/* Foco de painéis (desktop) */}
            {!isMobile && (
              <div className="inline-flex shrink-0 p-1 rounded-xl bg-muted/60 border border-border/60">
                {([
                  { key: 'split' as const, label: 'Dividido', Icon: Columns2 },
                  { key: 'transcription' as const, label: 'Transcrição', Icon: MessageSquare },
                  { key: 'structure' as const, label: 'Anamnese', Icon: Maximize2 },
                ]).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFocusPane(key)}
                    aria-pressed={focusPane === key}
                    title={label}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
                      focusPane === key
                        ? "bg-card text-primary shadow-sm border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden 2xl:inline">{label}</span>

                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Tempo + status + controles */}
          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            {/* Onda mínima no mobile (o chip completo fica escondido) */}
            {isMobile && (
              <span className="flex items-center gap-[2.5px] h-4 overflow-hidden shrink-0" aria-hidden>
                {[0.5, 0.9, 0.65, 1, 0.6].map((factor, i) => {
                  const active = isRecording && !isPaused;
                  const h = active
                    ? Math.max(3, Math.min(14, 3 + audioLevel * 26 * factor))
                    : [5, 9, 6, 10, 5][i];
                  return (
                    <motion.span
                      key={i}
                      className={cn("w-[2px] rounded-full", active ? "bg-primary" : isPaused ? "bg-muted-foreground/40" : "bg-primary/30")}
                      animate={{ height: h }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      style={{ height: h }}
                    />
                  );
                })}
              </span>
            )}
            <div className={cn(
              "flex items-center gap-1.5 md:gap-2 text-xs px-2 md:px-2.5 h-8 rounded-xl border transition-colors",
              isRecording && !isPaused
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                : isPaused
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400"
                : "bg-muted/40 border-border/60 text-muted-foreground"
            )}>
              {isRecording ? (
                <span className="relative flex h-2 w-2">
                  {!isPaused && <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isPaused ? "bg-yellow-500" : "bg-red-500")} />
                </span>
              ) : (
                <Clock className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="font-mono tabular-nums tracking-tight">{formattedTime}</span>
            </div>


            {!isRecording ? (
              <div className="relative group">
                <span
                  className="absolute -inset-1 rounded-xl opacity-50 blur-md group-hover:opacity-80 transition-opacity pointer-events-none"
                  style={{
                    background:
                      "conic-gradient(from 0deg, hsl(var(--primary) / 0), hsl(var(--primary) / 0.55), hsl(var(--primary) / 0), hsl(var(--primary) / 0.4), hsl(var(--primary) / 0))",
                  }}
                />
                <Button
                  onClick={startRecording}
                  disabled={isConnecting}
                  size="sm"
                  className="relative h-10 md:h-9 gap-2 px-3.5 md:px-5 rounded-xl font-medium shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.6)] bg-gradient-to-b from-primary to-primary/90 active:scale-[0.98]"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  <span className="text-xs font-medium">
                    {isConnecting ? 'Conectando…' : segments.length ? (isMobile ? 'Retomar' : 'Retomar gravação') : (isMobile ? 'Gravar' : 'Iniciar gravação')}
                  </span>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  variant="outline"
                  size="sm"
                  aria-label={isPaused ? 'Continuar gravação' : 'Pausar gravação'}
                  className="h-10 w-10 md:h-9 md:w-auto p-0 md:px-3.5 gap-1.5 rounded-xl bg-background/60"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  <span className="text-xs hidden md:inline">{isPaused ? 'Continuar' : 'Pausar'}</span>
                </Button>
                <Button
                  onClick={handleFinish}
                  size="sm"
                  className="h-10 md:h-9 gap-2 px-3.5 md:px-5 rounded-xl font-medium shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Finalizar</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile: seletor de modo de transcrição em linha própria */}
        {isMobile && (
          <div className="relative px-2 pb-2 -mt-0.5">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
              {([
                { key: false, label: 'Falantes', Icon: Users },
                { key: true, label: 'Contínua', Icon: MessageSquare },
              ]).map(({ key, label, Icon }) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setUnifiedMode(key)}
                  aria-pressed={unifiedMode === key}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium transition-all",
                    unifiedMode === key
                      ? "bg-card text-primary shadow-sm border border-border/50"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="h-8 flex-1 rounded-xl bg-muted/60 border-border/60 text-[12px]">
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent className="z-[80] max-h-72">
                  <SelectItem value="auto">Especialidade: automático</SelectItem>
                  {CONSULTATION_SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {specialty === "auto" && detectedSpecialty && (
                <span className="text-[10px] text-primary/80 whitespace-nowrap max-w-[92px] truncate">{detectedSpecialty}</span>
              )}
            </div>
          </div>
        )}


        {/* Faixa viva — só durante a gravação */}
        {isRecording && !isPaused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="relative border-t border-border/40 bg-muted/20"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:overflow-x-auto no-scrollbar">
              {!unifiedMode && (
                <div className="grid grid-cols-3 md:inline-flex md:items-center gap-1 p-0.5 rounded-full bg-card/70 ring-1 ring-border/60 shrink-0">

                  {([
                    { key: 'doctor' as const, label: 'Médico', short: '1', Icon: Stethoscope, active: 'bg-primary/15 text-primary ring-primary/30' },
                    { key: 'patient' as const, label: 'Paciente', short: '2', Icon: User, active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30' },
                    { key: 'companion' as const, label: 'Acompanhante', short: '3', Icon: Users, active: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30' },
                  ]).map(({ key, label, short, Icon, active }) => {
                    const isActive = currentSpeaker === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setCurrentSpeaker(key); if (navigator.vibrate) navigator.vibrate(8); }}
                        aria-pressed={isActive}
                        aria-label={`Marcar fala como ${label}`}
                        className={cn(
                          "inline-flex items-center justify-center gap-1 px-2 h-8 md:h-auto md:py-1 rounded-full text-[11px] font-medium transition-all ring-1",
                          isActive ? `${active} shadow-sm` : "text-muted-foreground ring-transparent hover:text-foreground hover:bg-muted/60"
                        )}

                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                        <kbd className="hidden md:inline-flex items-center justify-center h-4 min-w-4 px-1 rounded bg-background/80 ring-1 ring-border/60 text-[9px] font-mono text-muted-foreground">{short}</kbd>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="min-w-0 flex-1">
                {partialTranscription ? (
                  <motion.p
                    key={partialTranscription}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-foreground/80 italic truncate"
                  >
                    {partialTranscription}
                  </motion.p>
                ) : (
                  <p className="text-[11px] text-muted-foreground/70 inline-flex items-center gap-1.5">
                    <span className="inline-flex gap-0.5">
                      <span className="animate-thinking-dot text-base leading-none">•</span>
                      <span className="animate-thinking-dot [animation-delay:0.18s] text-base leading-none">•</span>
                      <span className="animate-thinking-dot [animation-delay:0.36s] text-base leading-none">•</span>
                    </span>
                    {isTranscribing ? 'Ouvindo' : 'Aguardando fala'}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {isFinalizing && (
          <div className="relative flex items-center gap-2 px-3 py-1.5 border-t border-border/40 bg-muted/30 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Revisão final do áudio em andamento…</span>
          </div>
        )}
      </header>


      {/* Main Content */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mx-0 h-11 p-0 rounded-none border-b bg-card/60">
            <TabsTrigger value="transcription" className="h-11 gap-2 rounded-none text-[13px] data-[state=active]:bg-muted data-[state=active]:text-primary">
              <MessageSquare className="h-4 w-4" />
              Transcrição
              {segments.length > 0 && (
                <span className="ml-0.5 text-[10px] font-mono text-muted-foreground">{segments.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="structure" className="h-11 gap-2 rounded-none text-[13px] data-[state=active]:bg-muted data-[state=active]:text-primary">
              <FileText className="h-4 w-4" />
              Anamnese
              <span className="ml-0.5 text-[10px] font-mono text-muted-foreground">{countFilledSections(structure)}/11</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcription" className="flex-1 m-0 overflow-hidden">
            <TranscriptionPane
              segments={segments}
              isTranscribing={isTranscribing}
              isRecording={isRecording && !isPaused}
              onChangeSpeaker={changeSpeaker}
              onDeleteSegment={deleteSegment}
              unifiedMode={unifiedMode}
            />
          </TabsContent>
          <TabsContent value="structure" className="flex-1 m-0 overflow-hidden">
            <StructuredPane
              structure={structure}
              isStructuring={isStructuring}
              onUpdateField={updateStructureField}
              changedFields={changedFields}
              lastStructuredAt={lastStructuredAt}
              smartSummary={smartSummary}
              isSummarizing={isSummarizing}
              onGenerateSummary={generateSummary}
              onSendToAssistant={() => handleSendToAssistant('/clinicus')}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
            {focusPane !== 'structure' && (
              <ResizablePanel defaultSize={focusPane === 'transcription' ? 100 : 45} minSize={25}>
                <Card className="rounded-none border-0 h-full overflow-hidden">
                  <TranscriptionPane
                    segments={segments}
                    isTranscribing={isTranscribing}
                    isRecording={isRecording && !isPaused}
                    onChangeSpeaker={changeSpeaker}
                    onDeleteSegment={deleteSegment}
                    unifiedMode={unifiedMode}
                  />
                </Card>
              </ResizablePanel>
            )}
            {focusPane === 'split' && <ResizableHandle withHandle />}
            {focusPane !== 'transcription' && (
              <ResizablePanel defaultSize={focusPane === 'structure' ? 100 : 55} minSize={25}>
                <Card className="rounded-none border-0 h-full overflow-hidden">
                  <StructuredPane
                    structure={structure}
                    isStructuring={isStructuring}
                    onUpdateField={updateStructureField}
                    changedFields={changedFields}
                    lastStructuredAt={lastStructuredAt}
                    smartSummary={smartSummary}
                    isSummarizing={isSummarizing}
                    onGenerateSummary={generateSummary}
                    onSendToAssistant={() => handleSendToAssistant('/clinicus')}
                  />
                </Card>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      )}

      {/* Rodapé de fluxo — próximos passos sempre visíveis */}
      <footer
        className="shrink-0 border-t border-border/60 bg-card/80 backdrop-blur-sm px-3 md:px-4 py-2"
        style={isMobile ? { paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' } : undefined}
      >
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between gap-2">
          {/* Estado do fluxo */}
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs overflow-x-auto no-scrollbar">
            {([
              {
                label: isRecording ? 'Gravando' : segments.length > 0 ? `Transcrição · ${segments.length}` : 'Gravação',
                done: !isRecording && segments.length > 0,
                active: isRecording,
              },
              {
                label: `Anamnese · ${countFilledSections(structure)}/11`,
                done: countFilledSections(structure) > 0 && !isStructuring,
                active: isStructuring,
              },
              {
                label: savedCaseId ? 'Caso salvo' : 'Salvar caso',
                done: !!savedCaseId,
                active: false,
              },
            ]).map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <span className="text-muted-foreground/40">›</span>}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 whitespace-nowrap',
                    s.done
                      ? 'bg-primary/10 text-primary ring-primary/25'
                      : s.active
                      ? 'bg-muted text-foreground ring-border'
                      : 'text-muted-foreground ring-border/50'
                  )}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : s.active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Próximos passos */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isRecording ? (
              <span className="text-[11px] text-muted-foreground">
                Fale normalmente — toque em Finalizar quando a consulta terminar.
              </span>
            ) : segments.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">
                Inicie a gravação para começar a transcrição.
              </span>
            ) : isMobile ? (
              <div className="w-full flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Atualizar anamnese"
                    className="h-10 w-10 p-0 rounded-full shrink-0 bg-background/60"
                    onClick={handleGenerateStructure}
                    disabled={isStructuring}
                  >
                    {isStructuring ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Copiar anamnese"
                    className="h-10 w-10 p-0 rounded-full shrink-0 bg-background/60"
                    onClick={handleCopyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Enviar ao Clínicus"
                    className="h-10 w-10 p-0 rounded-full shrink-0 bg-background/60"
                    onClick={() => handleSendToAssistant('/clinicus')}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="h-10 flex-1 gap-1.5 rounded-full text-xs font-medium"
                  onClick={() => {
                    setFinalizeError(null);
                    if (finalizePhase === 'done') {
                      setShowFinishDialog(true);
                    } else {
                      void runFinalizeFlow({ alreadyStopped: true });
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  {savedCaseId ? 'Caso salvo' : finalizePhase === 'done' ? 'Salvar caso' : 'Concluir e salvar'}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                  onClick={handleGenerateStructure}
                  disabled={isStructuring}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {isStructuring ? 'Estruturando…' : 'Atualizar anamnese'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                  onClick={handleCopyToClipboard}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar anamnese
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                  onClick={() => handleSendToAssistant('/clinicus')}
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar ao Clínicus
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs px-4"
                  onClick={() => {
                    setFinalizeError(null);
                    if (finalizePhase === 'done') {
                      setShowFinishDialog(true);
                    } else {
                      void runFinalizeFlow({ alreadyStopped: true });
                    }
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                  {savedCaseId ? 'Caso salvo' : finalizePhase === 'done' ? 'Salvar caso' : 'Concluir e salvar'}
                </Button>
              </>
            )}
          </div>
        </div>

      </footer>


      {/* Fluxo de finalização guiado */}
      {showFinishDialog && (
        <FinalizeFlow
          phase={finalizePhase}
          errorMessage={finalizeError}
          formattedTime={formattedTime}
          segmentsCount={segments.length}
          filledSections={countFilledSections(structure)}
          totalSections={11}
          caseName={caseName}
          onCaseNameChange={setCaseName}
          folders={folders}
          folderId={caseFolderId}
          onFolderChange={setCaseFolderId}
          onCreateFolder={createFolder}
          isCreatingFolder={isCreatingFolder}
          consultationDate={consultationDate}
          onConsultationDateChange={setConsultationDate}

          isSavingCase={isSavingCase}
          savedCaseId={savedCaseId}
          onSaveCase={handleSaveCase}
          onCopyAnamnesis={handleCopyToClipboard}
          onCopyTranscript={handleCopyTranscript}
          onRetry={() => void runFinalizeFlow({ alreadyStopped: true })}
          onContinueEditing={() => setShowFinishDialog(false)}
          onExit={handleExit}
        />
      )}


    </div>
  );
}
