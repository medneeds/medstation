import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import { useContinuousRecording } from "@/hooks/useContinuousRecording";
import { useConsultation } from "@/hooks/useConsultation";
import { AudioVisualizer } from "@/components/consultation/AudioVisualizer";
import { TranscriptionPane } from "@/components/consultation/TranscriptionPane";
import { StructuredPane } from "@/components/consultation/StructuredPane";
import { cn } from "@/lib/utils";

interface ConsultationModeProps {
  caseId?: string;
  onExit: () => void;
}

export function ConsultationMode({ caseId, onExit }: ConsultationModeProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const {
    segments,
    structure,
    isTranscribing,
    isStructuring,
    formattedTime,
    processAudioChunk,
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
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleExit}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Modo Consultório</h1>
            <p className="text-xs text-muted-foreground">Clínicus</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{formattedTime}</span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-xs text-muted-foreground">
                {isPaused ? 'Pausado' : 'Gravando'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Audio Control Bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-b bg-muted/30">
        <AudioVisualizer 
          level={audioLevel} 
          isActive={isRecording && !isPaused}
          className="w-48"
        />
        
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <Button onClick={handleStart} size="lg" className="gap-2">
              <Mic className="h-5 w-5" />
              Iniciar Consulta
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={handleResume} variant="outline" size="lg" className="gap-2">
                  <Play className="h-5 w-5" />
                  Continuar
                </Button>
              ) : (
                <Button onClick={handlePause} variant="outline" size="lg" className="gap-2">
                  <Pause className="h-5 w-5" />
                  Pausar
                </Button>
              )}
              <Button onClick={handleFinish} variant="default" size="lg" className="gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Finalizar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left - Transcription */}
        <Card className="rounded-none border-0 border-r h-full overflow-hidden">
          <TranscriptionPane
            segments={segments}
            isTranscribing={isTranscribing}
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

      {/* Finish Dialog */}
      {showFinishDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Consulta Finalizada</h2>
                <p className="text-sm text-muted-foreground">
                  Duração: {formattedTime} • {segments.length} falas registradas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4" />
                Copiar Texto
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <Download className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <Save className="h-4 w-4" />
                Salvar no Caso
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setShowFinishDialog(false)}>
                Continuar Editando
              </Button>
              <Button onClick={handleExit}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
