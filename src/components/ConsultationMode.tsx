import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Save,
  MessageSquare,
  FileText,
  Loader2,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useConsultation } from "@/hooks/useConsultation";
import { AudioVisualizer } from "@/components/consultation/AudioVisualizer";
import { TranscriptionPane } from "@/components/consultation/TranscriptionPane";
import { StructuredPane } from "@/components/consultation/StructuredPane";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConsultationModeProps {
  caseId?: string;
  onExit: () => void;
}

export function ConsultationMode({ caseId, onExit }: ConsultationModeProps) {
  const isMobile = useIsMobile();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("transcription");
  const [caseName, setCaseName] = useState<string>("");
  const [isSavingCase, setIsSavingCase] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
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

  const handleFinish = useCallback(async () => {
    await stopRecording();
    setShowFinishDialog(true);
  }, [stopRecording]);

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

  const handleCopyToClipboard = useCallback(() => {
    const text = Object.entries(structure)
      .filter(([_, value]) => value?.trim())
      .map(([key, value]) => {
        const labels: Record<string, string> = {
          chiefComplaint: 'QUEIXA PRINCIPAL',
          historyPresentIllness: 'HISTÓRIA DA DOENÇA ATUAL',
          pastMedicalHistory: 'HISTÓRIA PATOLÓGICA PREGRESSA',
          familyHistory: 'HISTÓRIA FAMILIAR',
          medications: 'MEDICAMENTOS EM USO',
          allergies: 'ALERGIAS',
          socialHistory: 'HÁBITOS DE VIDA',
          reviewOfSystems: 'REVISÃO DE SISTEMAS',
          physicalExam: 'EXAME FÍSICO',
          diagnosticHypotheses: 'HIPÓTESES DIAGNÓSTICAS',
          plan: 'CONDUTA',
        };
        return `${labels[key] || key}:\n${value}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(text);
    toast.success('Copiado 👏 Cole direto no prontuário.');
  }, [structure]);

  const buildStructuredText = useCallback(() => {
    const labels: Record<string, string> = {
      chiefComplaint: 'QUEIXA PRINCIPAL',
      historyPresentIllness: 'HISTÓRIA DA DOENÇA ATUAL',
      pastMedicalHistory: 'HISTÓRIA PATOLÓGICA PREGRESSA',
      familyHistory: 'HISTÓRIA FAMILIAR',
      medications: 'MEDICAMENTOS EM USO',
      allergies: 'ALERGIAS',
      socialHistory: 'HÁBITOS DE VIDA',
      reviewOfSystems: 'REVISÃO DE SISTEMAS',
      physicalExam: 'EXAME FÍSICO',
      diagnosticHypotheses: 'HIPÓTESES DIAGNÓSTICAS',
      plan: 'CONDUTA',
    };
    return Object.entries(structure)
      .filter(([_, v]) => v?.trim())
      .map(([k, v]) => `${labels[k] || k}:\n${v}`)
      .join('\n\n');
  }, [structure]);

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
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      setSavedCaseId(data.id);
      toast.success('Caso salvo 👏');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível salvar o caso.');
    } finally {
      setIsSavingCase(false);
    }
  }, [caseName, buildStructuredText, structure.chiefComplaint]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border/60 bg-gradient-to-r from-card via-card to-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={handleExit} className="h-8 w-8 md:h-10 md:w-10 rounded-full">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm md:text-base tracking-tight flex items-center gap-2">
              Modo Consultório
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] md:text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 text-primary ring-1 ring-primary/20">
                Premium
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground">Clínicus · Transcrição ao vivo + revisão final do áudio</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Toggle: modo unificado (sem identificação de falante) */}
          <button
            type="button"
            onClick={() => setUnifiedMode((v) => !v)}
            aria-pressed={unifiedMode}
            title={unifiedMode ? 'Voltar para identificação de falantes' : 'Transcrever tudo como um único bloco, sem identificar falantes'}
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-xs font-medium ring-1 transition-colors",
              unifiedMode
                ? "bg-primary/15 ring-primary/30 text-primary"
                : "bg-muted/50 ring-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3 w-3 md:h-3.5 md:w-3.5" />
            <span>{unifiedMode ? 'Transcrição contínua' : 'Identificar falantes'}</span>
          </button>

          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm px-2.5 py-1 rounded-full bg-muted/50 ring-1 ring-border/60">
            <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
            <span className="font-mono tabular-nums tracking-tight">{formattedTime}</span>
          </div>

          {isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-1.5 md:gap-2 px-2.5 py-1 rounded-full ring-1 transition-colors",
                isPaused
                  ? "bg-yellow-500/10 ring-yellow-500/30 text-yellow-600 dark:text-yellow-400"
                  : "bg-red-500/10 ring-red-500/30 text-red-600 dark:text-red-400"
              )}
            >
              <span className="relative flex h-2 w-2">
                {!isPaused && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                )}
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isPaused ? "bg-yellow-500" : "bg-red-500"
                )} />
              </span>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider hidden sm:inline">
                {isPaused ? 'Pausado' : 'Gravando'}
              </span>
            </motion.div>
          )}
        </div>
      </header>

      {/* Audio Control Bar — premium surface */}
      <div className="relative overflow-hidden border-b border-border/60">
        {/* Layered ambient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-background/60 to-background pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)",
          }}
        />
        {isRecording && !isPaused && (
          <>
            <motion.div
              className="absolute inset-x-0 top-0 h-px pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)",
              }}
              animate={{ opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -inset-x-10 -top-20 h-40 blur-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(50% 50% at 50% 50%, hsl(var(--primary) / 0.25), transparent 70%)",
              }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        <div className="relative flex flex-col items-center gap-4 md:gap-6 px-3 md:px-4 py-6 md:py-8">
          <AudioVisualizer
            level={audioLevel}
            isActive={isRecording && !isPaused}
            currentSpeaker={isRecording && !isPaused && !unifiedMode ? currentSpeaker : undefined}
            className="w-full max-w-sm"
          />

          {/* Speaker switcher — quem está falando agora (afeta os próximos segmentos) */}
          {isRecording && !isPaused && !unifiedMode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card/60 ring-1 ring-border/60 backdrop-blur-sm shadow-sm">
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
                        "inline-flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ring-1",
                        isActive
                          ? `${active} shadow-sm scale-[1.02]`
                          : "text-muted-foreground ring-transparent hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span>{label}</span>
                      <kbd className="hidden md:inline-flex items-center justify-center h-4 min-w-4 px-1 rounded bg-background/80 ring-1 ring-border/60 text-[9px] font-mono text-muted-foreground">{short}</kbd>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/70 hidden md:block">Toque ou use 1 / 2 / 3 para trocar quem está falando</p>
            </motion.div>
          )}
          {/* Live partial transcript indicator */}
          {isRecording && !isPaused && (
            <div className="text-center min-h-[1.5rem] max-w-md px-3">
              {partialTranscription ? (
                <motion.p
                  key={partialTranscription}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-foreground/80 italic leading-relaxed"
                >
                  {partialTranscription}
                </motion.p>
              ) : (
                <p className="text-xs text-muted-foreground/70 inline-flex items-center gap-1.5">
                  <span className="inline-flex gap-0.5">
                    <span className="animate-thinking-dot text-base leading-none">•</span>
                    <span className="animate-thinking-dot [animation-delay:0.18s] text-base leading-none">•</span>
                    <span className="animate-thinking-dot [animation-delay:0.36s] text-base leading-none">•</span>
                  </span>
                  {isTranscribing ? 'Ouvindo' : 'Aguardando fala'}
                </p>
              )}
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <div className="relative group">
                {/* Premium halo behind start button */}
                <span
                  className="absolute -inset-1.5 rounded-full opacity-60 blur-md group-hover:opacity-90 transition-opacity pointer-events-none"
                  style={{
                    background:
                      "conic-gradient(from 0deg, hsl(var(--primary) / 0), hsl(var(--primary) / 0.55), hsl(var(--primary) / 0), hsl(var(--primary) / 0.4), hsl(var(--primary) / 0))",
                  }}
                />
                <Button
                  onClick={startRecording}
                  disabled={isConnecting}
                  size={isMobile ? "default" : "lg"}
                  className="relative gap-2 px-7 rounded-full shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] bg-gradient-to-b from-primary to-primary/90 hover:from-primary hover:to-primary transition-all hover:shadow-[0_12px_36px_-10px_hsl(var(--primary)/0.7)] active:scale-[0.98]"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                      <span className="text-sm md:text-base font-medium">Conectando…</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 md:h-5 md:w-5" />
                      <span className="text-sm md:text-base font-medium">Iniciar Gravação</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resumeRecording} variant="outline" size={isMobile ? "default" : "lg"} className="gap-2 rounded-full px-5 backdrop-blur-sm bg-background/60">
                    <Play className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-sm md:text-base">Continuar</span>
                  </Button>
                ) : (
                  <Button onClick={pauseRecording} variant="outline" size={isMobile ? "default" : "lg"} className="gap-2 rounded-full px-5 backdrop-blur-sm bg-background/60">
                    <Pause className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-sm md:text-base">Pausar</span>
                  </Button>
                )}
                <Button
                  onClick={handleFinish}
                  variant="default"
                  size={isMobile ? "default" : "lg"}
                  className="gap-2 px-6 rounded-full shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base font-medium">Finalizar</span>
                </Button>
              </>
            )}
          </div>

          {isFinalizing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-muted/40 ring-1 ring-border/60"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Revisão final do áudio em andamento…</span>
            </motion.div>
          )}

          {segments.length > 0 && !isRecording && !isFinalizing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <Button
                onClick={handleGenerateStructure}
                disabled={isStructuring}
                size="lg"
                variant="secondary"
                className="gap-2 px-6 rounded-full bg-gradient-to-b from-primary/15 to-primary/5 hover:from-primary/25 hover:to-primary/10 text-primary ring-1 ring-primary/25 shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.4)]"
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">{isStructuring ? 'Estruturando...' : 'Gerar Estruturação Clínica'}</span>
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isMobile ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mx-0 rounded-none border-b">
            <TabsTrigger value="transcription" className="gap-2 data-[state=active]:bg-muted">
              <MessageSquare className="h-4 w-4" />
              Transcrição
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-2 data-[state=active]:bg-muted">
              <FileText className="h-4 w-4" />
              Estrutura
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
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          <Card className="rounded-none border-0 border-r h-full overflow-hidden">
            <TranscriptionPane
              segments={segments}
              isTranscribing={isTranscribing}
              isRecording={isRecording && !isPaused}
              onChangeSpeaker={changeSpeaker}
              onDeleteSegment={deleteSegment}
              unifiedMode={unifiedMode}
            />
          </Card>
          <Card className="rounded-none border-0 h-full overflow-hidden">
            <StructuredPane
              structure={structure}
              isStructuring={isStructuring}
              onUpdateField={updateStructureField}
            />
          </Card>
        </div>
      )}

      {/* Finish Dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
          <Card className="max-w-lg w-full p-4 md:p-6 space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-base md:text-lg">Consulta Finalizada</h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Duração: {formattedTime} • {segments.length} {segments.length === 1 ? 'segmento' : 'segmentos'}
                  {isFinalizing && ' • revisando o áudio…'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
                onClick={handleGenerateStructure}
                disabled={segments.length === 0 || isStructuring || isFinalizing}
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs md:text-sm">
                  {isStructuring ? 'Estruturando...' : 'Gerar estruturação'}
                </span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4" />
                <span className="text-xs md:text-sm">Copiar</span>
              </Button>
            </div>

            {/* Salvar caso — única ação de persistência */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="case-name" className="text-xs md:text-sm">
                Salvar este caso no seu histórico
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="case-name"
                  placeholder="Dê um nome ao caso (ex.: Sr. João — dor torácica)"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  disabled={isSavingCase || !!savedCaseId}
                  maxLength={120}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCase(); }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveCase}
                  disabled={isSavingCase || !caseName.trim() || !!savedCaseId || segments.length === 0}
                  className="gap-2 sm:w-auto"
                >
                  {isSavingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="text-xs md:text-sm">
                    {savedCaseId ? 'Salvo' : isSavingCase ? 'Salvando...' : 'Salvar caso'}
                  </span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tudo o que foi transcrito e estruturado será guardado com esse nome.
              </p>
            </div>


            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setShowFinishDialog(false)} className="w-full sm:w-auto">
                Continuar Editando
              </Button>
              <Button size="sm" onClick={handleExit} className="w-full sm:w-auto">
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
