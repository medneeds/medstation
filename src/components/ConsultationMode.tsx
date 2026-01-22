import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Save,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useContinuousRecording } from "@/hooks/useContinuousRecording";
import { useConsultation } from "@/hooks/useConsultation";
import { AudioVisualizer } from "@/components/consultation/AudioVisualizer";
import { TranscriptionPane } from "@/components/consultation/TranscriptionPane";
import { StructuredPane } from "@/components/consultation/StructuredPane";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConsultationModeProps {
  caseId?: string;
  onExit: () => void;
}

export function ConsultationMode({ caseId, onExit }: ConsultationModeProps) {
  const isMobile = useIsMobile();
  const [audioLevel, setAudioLevel] = useState(0);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("transcription");

  const {
    segments,
    structure,
    isTranscribing,
    isStructuring,
    formattedTime,
    currentSpeaker,
    processAudioChunk,
    updateStructure,
    changeSpeaker,
    deleteSegment,
    updateStructureField,
    startTimer,
    stopTimer,
    reset,
    finalize,
  } = useConsultation({ caseId });

  const {
    isRecording,
    isPaused,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useContinuousRecording({
    onAudioChunk: processAudioChunk,
    onAudioLevel: setAudioLevel,
    chunkIntervalMs: 3000,
  });

  const handleStart = useCallback(async () => {
    await startRecording();
    startTimer();
    toast.success('Modo Consultório ativado');
  }, [startRecording, startTimer]);

  const handlePause = useCallback(() => {
    pauseRecording();
    toast.info('Gravação pausada');
  }, [pauseRecording]);

  const handleResume = useCallback(() => {
    resumeRecording();
    toast.info('Gravação retomada');
  }, [resumeRecording]);

  const handleFinish = useCallback(async () => {
    stopRecording();
    await finalize();
    setShowFinishDialog(true);
  }, [stopRecording, finalize]);

  const handleGenerateStructure = useCallback(async () => {
    try {
      await updateStructure();
      toast.success('Estruturação gerada a partir da transcrição completa');
      setActiveTab('structure');
      setShowFinishDialog(false);
    } catch {
      toast.error('Não foi possível gerar a estruturação agora');
    }
  }, [updateStructure]);

  const handleExit = useCallback(() => {
    if (isRecording) {
      stopRecording();
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
    toast.success('Copiado para a área de transferência');
  }, [structure]);

  if (error) {
    toast.error(error);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b bg-card">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={handleExit} className="h-8 w-8 md:h-10 md:w-10">
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm md:text-base">Modo Consultório</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground">Clínicus</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <span className="font-mono">{formattedTime}</span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-1 md:gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">
                {isPaused ? 'Pausado' : 'Gravando'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Audio Control Bar */}
      <div className="flex flex-col items-center gap-4 md:gap-6 px-3 md:px-4 py-6 md:py-8 border-b bg-gradient-to-b from-muted/50 to-background relative overflow-hidden">
        {/* Background pulse when recording */}
        {isRecording && !isPaused && (
          <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
        )}
        
        {/* Audio Visualizer */}
        <AudioVisualizer 
          level={audioLevel} 
          isActive={isRecording && !isPaused}
          currentSpeaker={isRecording && !isPaused ? currentSpeaker : undefined}
          className="w-full max-w-sm"
        />
        
        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button onClick={handleStart} size={isMobile ? "default" : "lg"} className="gap-2 px-6">
              <Mic className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-sm md:text-base">Iniciar Gravação</span>
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={handleResume} variant="outline" size={isMobile ? "default" : "lg"} className="gap-2">
                  <Play className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base">Continuar</span>
                </Button>
              ) : (
                <Button onClick={handlePause} variant="outline" size={isMobile ? "default" : "lg"} className="gap-2">
                  <Pause className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="text-sm md:text-base">Pausar</span>
                </Button>
              )}
              <Button onClick={handleFinish} variant="default" size={isMobile ? "default" : "lg"} className="gap-2 px-6">
                <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Finalizar</span>
              </Button>
            </>
          )}
        </div>

        {/* Structure Generation Button - Always visible when there are segments */}
        {segments.length > 0 && !isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              onClick={handleGenerateStructure}
              disabled={isStructuring || isTranscribing}
              size="lg"
              variant="secondary"
              className="gap-2 px-6 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            >
              <FileText className="h-5 w-5" />
              <span>{isStructuring ? 'Estruturando...' : 'Gerar Estruturação Clínica'}</span>
            </Button>
          </motion.div>
        )}
      </div>

      {/* Main Content - Split View on desktop, Tabs on mobile */}
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
          {/* Left - Transcription */}
          <Card className="rounded-none border-0 border-r h-full overflow-hidden">
            <TranscriptionPane
              segments={segments}
              isTranscribing={isTranscribing}
              isRecording={isRecording && !isPaused}
              onChangeSpeaker={changeSpeaker}
              onDeleteSegment={deleteSegment}
            />
          </Card>

          {/* Right - Structure */}
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
                  Duração: {formattedTime} • {segments.length} falas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
                onClick={handleGenerateStructure}
                disabled={segments.length === 0 || isStructuring || isTranscribing}
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
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" disabled>
                <Download className="h-4 w-4" />
                <span className="text-xs md:text-sm">PDF</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" disabled>
                <Save className="h-4 w-4" />
                <span className="text-xs md:text-sm">Salvar</span>
              </Button>
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
