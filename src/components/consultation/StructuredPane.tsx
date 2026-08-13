import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  Stethoscope,
  History,
  Users,
  Pill,
  AlertTriangle,
  Heart,
  ClipboardList,
  Activity,
  Lightbulb,
  FileCheck,
  Copy,
  Check,
  Sparkles,
  Send,
} from "lucide-react";
import type { AnamnesisStructure } from "@/hooks/useConsultation";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";
import { ANAMNESIS_LABELS, buildAnamnesisText } from "@/lib/anamnesis";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface StructuredPaneProps {
  structure: AnamnesisStructure;
  isStructuring: boolean;
  onUpdateField: (field: keyof AnamnesisStructure, value: string) => void;
  changedFields?: Set<keyof AnamnesisStructure>;
  lastStructuredAt?: Date | null;
  smartSummary?: string;
  isSummarizing?: boolean;
  onGenerateSummary?: () => void;
  onSendToAssistant?: () => void;
}

interface SectionConfig {
  key: keyof AnamnesisStructure;
  label: string;
  shortLabel: string;
  icon: typeof FileText;
  placeholder: string;
}

const sections: SectionConfig[] = [
  {
    key: 'chiefComplaint',
    label: 'Queixa Principal',
    shortLabel: 'QP',
    icon: FileText,
    placeholder: 'Ex: Dor abdominal há 3 dias',
  },
  {
    key: 'historyPresentIllness',
    label: 'História da Doença Atual',
    shortLabel: 'HDA',
    icon: Stethoscope,
    placeholder: 'Caracterização do quadro atual...',
  },
  {
    key: 'pastMedicalHistory',
    label: 'História Patológica Pregressa',
    shortLabel: 'HPP',
    icon: History,
    placeholder: 'Doenças prévias, cirurgias, internações...',
  },
  {
    key: 'familyHistory',
    label: 'História Familiar',
    shortLabel: 'HF',
    icon: Users,
    placeholder: 'Antecedentes familiares relevantes...',
  },
  {
    key: 'medications',
    label: 'Medicamentos em Uso',
    shortLabel: 'MED',
    icon: Pill,
    placeholder: 'Medicamentos com doses...',
  },
  {
    key: 'allergies',
    label: 'Alergias',
    shortLabel: 'ALG',
    icon: AlertTriangle,
    placeholder: 'Alergias conhecidas ou nega...',
  },
  {
    key: 'socialHistory',
    label: 'Hábitos de Vida',
    shortLabel: 'HAB',
    icon: Heart,
    placeholder: 'Tabagismo, etilismo, atividade física...',
  },
  {
    key: 'reviewOfSystems',
    label: 'Revisão de Sistemas',
    shortLabel: 'RS',
    icon: ClipboardList,
    placeholder: 'Outros sistemas investigados...',
  },
  {
    key: 'physicalExam',
    label: 'Exame Físico',
    shortLabel: 'EF',
    icon: Activity,
    placeholder: 'Achados do exame físico...',
  },
  {
    key: 'diagnosticHypotheses',
    label: 'Hipóteses Diagnósticas',
    shortLabel: 'HD',
    icon: Lightbulb,
    placeholder: 'Diagnósticos considerados...',
  },
  {
    key: 'plan',
    label: 'Conduta',
    shortLabel: 'CD',
    icon: FileCheck,
    placeholder: 'Plano terapêutico proposto...',
  },
];

export function StructuredPane({
  structure,
  isStructuring,
  onUpdateField,
  changedFields,
  lastStructuredAt,
  smartSummary,
  isSummarizing,
  onGenerateSummary,
  onSendToAssistant,
}: StructuredPaneProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['chiefComplaint', 'historyPresentIllness'])
  );
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filledSections = sections.filter(s => structure[s.key]?.trim());
  const emptySections = sections.filter(s => !structure[s.key]?.trim());
  const progress = Math.round((filledSections.length / sections.length) * 100);

  const handleCopyStructure = async () => {
    const text = buildAnamnesisText(structure);
    if (!text) {
      toast.error("Gere a estruturação antes de copiar.");
      return;
    }
    const ok = await copyText(text);
    if (!ok) {
      toast.error("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
      return;
    }
    setCopied(true);
    toast.success("Anamnese copiada 👏 Cole direto no prontuário.");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopySection = async (key: keyof AnamnesisStructure) => {
    const value = structure[key]?.trim();
    if (!value) return;
    const ok = await copyText(`${ANAMNESIS_LABELS[key]}:\n${value}`);
    if (!ok) {
      toast.error("Não foi possível copiar esta seção.");
      return;
    }
    setCopiedSection(key);
    toast.success("Seção copiada 👏");
    setTimeout(() => setCopiedSection(null), 1600);
  };

  const handleCopySummary = async () => {
    if (!smartSummary) return;
    const ok = await copyText(smartSummary);
    toast[ok ? "success" : "error"](ok ? "Resumo copiado 👏" : "Não foi possível copiar o resumo.");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-xs md:text-sm shrink-0">Anamnese estruturada</h3>
          <AnimatePresence>
            {isStructuring && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 ring-1 ring-primary/20 text-primary text-[10px] md:text-xs"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Organizando…</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onGenerateSummary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerateSummary}
              disabled={isSummarizing || filledSections.length === 0}
              className="h-7 gap-1.5 px-2 text-[11px] md:text-xs text-muted-foreground hover:text-primary"
            >
              {isSummarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline">Resumo</span>
            </Button>
          )}
          {onSendToAssistant && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSendToAssistant}
              disabled={filledSections.length === 0}
              className="h-7 gap-1.5 px-2 text-[11px] md:text-xs text-muted-foreground hover:text-primary"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Enviar</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyStructure}
            disabled={filledSections.length === 0}
            className="h-7 gap-1.5 px-2 text-[11px] md:text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
          </Button>
        </div>
      </div>

      {/* Barra de progresso viva */}
      <div className="relative h-1 bg-muted/60 overflow-hidden shrink-0">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 to-primary"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {isStructuring && (
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      <ScrollArea className="flex-1 p-1.5 md:p-2">
        <div className="space-y-1">
          {/* Resumo inteligente */}
          <AnimatePresence>
            {smartSummary && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-2 rounded-lg border border-primary/25 bg-primary/5 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setShowSummary((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Resumo inteligente da consulta
                  </span>
                  {showSummary ? <ChevronDown className="h-4 w-4 text-primary/70" /> : <ChevronRight className="h-4 w-4 text-primary/70" />}
                </button>
                {showSummary && (
                  <div className="px-3 pb-3 space-y-2">
                    <pre className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed text-foreground/90">
                      {smartSummary}
                    </pre>
                    <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-7 gap-1.5 text-[11px]">
                      <Copy className="h-3.5 w-3.5" />
                      Copiar resumo
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado vazio */}
          {filledSections.length === 0 && !isStructuring && (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-6 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-xs md:text-sm">A anamnese vai se montando sozinha</p>
              <p className="text-[10px] md:text-xs">Conforme a conversa avança, cada seção aparece aqui</p>
            </div>
          )}

          {/* Seções preenchidas */}
          <AnimatePresence initial={false}>
            {filledSections.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSections.has(section.key);
              const isEditing = editingSection === section.key;
              const value = structure[section.key];
              const justChanged = changedFields?.has(section.key);

              return (
                <motion.div
                  key={section.key}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className={cn(
                    "rounded-lg transition-colors",
                    justChanged && "bg-primary/5 ring-1 ring-primary/25"
                  )}
                >
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleSection(section.key)}
                  >
                    <div className="flex items-center gap-1 pr-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex-1 justify-start h-auto py-1.5 md:py-2 px-2 md:px-3 min-w-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0" />
                          )}
                          <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0 text-primary" />
                          <span className="font-medium text-xs md:text-sm shrink-0">{section.shortLabel}</span>
                          {justChanged && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.6 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                            />
                          )}
                          <span className="text-[10px] md:text-xs text-muted-foreground ml-1.5 md:ml-2 truncate flex-1 text-left">
                            {!isExpanded && value}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Copiar ${section.label}`}
                        onClick={() => handleCopySection(section.key)}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        {copiedSection === section.key
                          ? <Check className="h-3.5 w-3.5 text-primary" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <div className="pl-7 md:pl-10 pr-2 md:pr-3 pb-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={value}
                              onChange={(e) => onUpdateField(section.key, e.target.value)}
                              placeholder={section.placeholder}
                              className="min-h-[60px] md:min-h-[80px] text-xs md:text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSection(null)}
                              className="text-xs"
                            >
                              Concluir
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="text-xs md:text-sm p-2 rounded bg-muted/50 cursor-text hover:bg-muted transition-colors whitespace-pre-wrap"
                            onClick={() => setEditingSection(section.key)}
                          >
                            {value || <span className="text-muted-foreground italic">{section.placeholder}</span>}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Seções aguardando */}
          {emptySections.length > 0 && filledSections.length > 0 && (
            <div className="pt-2 border-t mt-2">
              <p className="text-[10px] md:text-xs text-muted-foreground px-2 md:px-3 py-1">
                Aguardando ({emptySections.length})
              </p>
              <div className="flex flex-wrap gap-1 px-2 md:px-3">
                {emptySections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.key}
                      className="flex items-center gap-1 px-2 py-1 text-muted-foreground bg-muted/30 rounded"
                    >
                      <Icon className="h-3 w-3" />
                      <span className="text-[10px] md:text-xs">{section.shortLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {lastStructuredAt && (
            <p className="px-3 pt-2 text-[10px] text-muted-foreground/70">
              Atualizado às {lastStructuredAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
