import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Copy, FileText, Loader2, Save, AlertTriangle, Circle, FolderPlus, Folder, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseFolder } from "@/hooks/useCaseFolders";

export type FinalizePhase = "review" | "structuring" | "done" | "error";

interface FinalizeFlowProps {
  phase: FinalizePhase;
  errorMessage?: string | null;
  formattedTime: string;
  segmentsCount: number;
  filledSections: number;
  totalSections: number;
  caseName: string;
  onCaseNameChange: (v: string) => void;
  folders: CaseFolder[];
  folderId: string | null;
  onFolderChange: (id: string | null) => void;
  onCreateFolder: (name: string) => Promise<CaseFolder | null>;
  isCreatingFolder: boolean;
  consultationDate: string;
  onConsultationDateChange: (v: string) => void;
  isSavingCase: boolean;
  savedCaseId: string | null;
  onSaveCase: () => void;
  onCopyAnamnesis: () => void;
  onCopyTranscript: () => void;
  onRetry: () => void;
  onContinueEditing: () => void;
  onExit: () => void;
}


const STEPS: { key: FinalizePhase; label: string; hint: string; target: number }[] = [
  { key: "review", label: "Revisando o áudio", hint: "Transcrição de alta precisão em português", target: 55 },
  { key: "structuring", label: "Estruturando a anamnese", hint: "Organizando queixa, história, exame e conduta", target: 95 },
  { key: "done", label: "Pronto para salvar", hint: "Confira, copie ou guarde no seu histórico", target: 100 },
];

export function FinalizeFlow({
  phase,
  errorMessage,
  formattedTime,
  segmentsCount,
  filledSections,
  totalSections,
  caseName,
  onCaseNameChange,
  folders,
  folderId,
  onFolderChange,
  onCreateFolder,
  isCreatingFolder,
  consultationDate,
  onConsultationDateChange,
  isSavingCase,

  savedCaseId,
  onSaveCase,
  onCopyAnamnesis,
  onCopyTranscript,
  onRetry,
  onContinueEditing,
  onExit,
}: FinalizeFlowProps) {
  const [progress, setProgress] = useState(4);
  const progressRef = useRef(4);
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = async () => {
    const created = await onCreateFolder(newFolderName);
    if (created) {
      onFolderChange(created.id);
      setIsNewFolder(false);
      setNewFolderName("");
    }
  };


  useEffect(() => {
    if (phase === "error") return;
    const target = STEPS.find((s) => s.key === phase)?.target ?? 100;
    const id = setInterval(() => {
      const current = progressRef.current;
      if (current >= target) return;
      // aproxima suavemente do alvo da etapa atual
      const next = Math.min(target, current + Math.max(0.4, (target - current) * 0.06));
      progressRef.current = next;
      setProgress(next);
    }, 120);
    if (phase === "done") {
      progressRef.current = 100;
      setProgress(100);
    }
    return () => clearInterval(id);
  }, [phase]);

  const activeIndex = STEPS.findIndex((s) => s.key === phase);
  const isProcessing = phase === "review" || phase === "structuring";
  const canSave = phase === "done" && segmentsCount > 0;

  return (
    <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
      <Card className="max-w-lg w-full p-4 md:p-6 space-y-4 shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.45)]">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-full",
              phase === "error"
                ? "bg-destructive/10"
                : phase === "done"
                ? "bg-primary/10"
                : "bg-muted"
            )}
          >
            {phase === "error" ? (
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
            ) : phase === "done" ? (
              <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            ) : (
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 text-primary animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-base md:text-lg">
              {phase === "error"
                ? "Não foi possível concluir"
                : phase === "done"
                ? "Consulta pronta"
                : "Processando a consulta"}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              Duração {formattedTime} • {segmentsCount} {segmentsCount === 1 ? "trecho" : "trechos"}
              {phase === "done" && ` • ${filledSections}/${totalSections} campos preenchidos`}
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                phase === "error" ? "bg-destructive" : "bg-gradient-to-r from-primary/70 to-primary"
              )}
              animate={{ width: `${phase === "error" ? 100 : progress}%` }}
              transition={{ ease: "easeOut", duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {phase === "error"
                ? "Processo interrompido"
                : phase === "done"
                ? "Concluído"
                : STEPS[activeIndex]?.hint}
            </span>
            <span className="tabular-nums font-medium">
              {phase === "error" ? "—" : `${Math.round(progress)}%`}
            </span>
          </div>
        </div>

        {/* Etapas */}
        <ol className="space-y-2">
          {STEPS.map((step, i) => {
            const done = phase === "done" ? true : i < activeIndex;
            const active = i === activeIndex && isProcessing;
            return (
              <li key={step.key} className="flex items-start gap-2.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 mt-0.5 text-primary animate-spin shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0" />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      done || active ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {active && <p className="text-[11px] text-muted-foreground">{step.hint}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {phase === "error" && (
          <p className="text-xs text-destructive">
            {errorMessage || "Algo falhou durante o processamento. Sua transcrição continua salva na tela."}
          </p>
        )}

        {/* Ações */}
        {phase === "done" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={onCopyAnamnesis}>
              <FileText className="h-4 w-4" />
              <span className="text-xs md:text-sm">Copiar anamnese</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={onCopyTranscript}>
              <Copy className="h-4 w-4" />
              <span className="text-xs md:text-sm">Copiar transcrição</span>
            </Button>
          </div>
        )}

        {phase === "error" && (
          <Button variant="default" size="sm" className="gap-2" onClick={onRetry}>
            <Loader2 className="h-4 w-4" />
            <span className="text-xs md:text-sm">Tentar novamente</span>
          </Button>
        )}

        {/* Etapa final: salvar */}
        <div className="space-y-2 pt-3 border-t">
          <Label htmlFor="case-name" className="text-xs md:text-sm">
            Salvar este caso no seu histórico
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="case-name"
              placeholder="Dê um nome ao caso (ex.: Sr. João — dor torácica)"
              value={caseName}
              onChange={(e) => onCaseNameChange(e.target.value)}
              disabled={!canSave || isSavingCase || !!savedCaseId}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) onSaveCase();
              }}
            />
          </div>

          {/* Pasta e data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Pasta</Label>
              {isNewFolder ? (
                <div className="flex gap-1.5">
                  <Input
                    autoFocus
                    placeholder="Nome da nova pasta"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    disabled={isCreatingFolder}
                    maxLength={60}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreateFolder();
                      if (e.key === "Escape") setIsNewFolder(false);
                    }}
                  />
                  <Button size="icon" variant="default" className="shrink-0" onClick={() => void handleCreateFolder()} disabled={isCreatingFolder || !newFolderName.trim()}>
                    {isCreatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setIsNewFolder(false)} disabled={isCreatingFolder}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={folderId ?? "none"}
                  onValueChange={(v) => {
                    if (v === "__new__") {
                      setNewFolderName("");
                      setIsNewFolder(true);
                      return;
                    }
                    onFolderChange(v === "none" ? null : v);
                  }}
                  disabled={!canSave || isSavingCase || !!savedCaseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem pasta" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[60]">
                    <SelectItem value="none">Sem pasta</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <Folder className="h-3.5 w-3.5 text-primary" />
                          {f.name}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-2 text-primary">
                        <FolderPlus className="h-3.5 w-3.5" />
                        Criar nova pasta
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="case-date" className="text-[11px] text-muted-foreground">
                Data da consulta
              </Label>
              <Input
                id="case-date"
                type="date"
                value={consultationDate}
                onChange={(e) => onConsultationDateChange(e.target.value)}
                disabled={!canSave || isSavingCase || !!savedCaseId}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onSaveCase}
              disabled={!canSave || isSavingCase || !caseName.trim() || !!savedCaseId}
              className="gap-2"
            >
              {isSavingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="text-xs md:text-sm">
                {savedCaseId ? "Salvo" : isSavingCase ? "Salvando..." : "Salvar caso"}
              </span>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {canSave
              ? "Transcrição e anamnese serão guardadas com esse nome."
              : "Disponível assim que o processamento terminar."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onContinueEditing}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Continuar editando
          </Button>
          <Button size="sm" onClick={onExit} disabled={isProcessing} className="w-full sm:w-auto">
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
}
