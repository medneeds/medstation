import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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
} from "lucide-react";
import type { AnamnesisStructure } from "@/hooks/useConsultation";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface StructuredPaneProps {
  structure: AnamnesisStructure;
  isStructuring: boolean;
  onUpdateField: (field: keyof AnamnesisStructure, value: string) => void;
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
}: StructuredPaneProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['chiefComplaint', 'historyPresentIllness'])
  );
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filledSections = sections.filter(s => structure[s.key]?.trim());
  const emptySections = sections.filter(s => !structure[s.key]?.trim());

  const handleCopyStructure = () => {
    const text = filledSections
      .map((s) => `${s.label.toUpperCase()}:\n${structure[s.key]}`)
      .join("\n\n");
    if (!text) {
      toast.error("Gere a estruturação antes de copiar.");
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Estruturação copiada 👏");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b bg-muted/30">
        <h3 className="font-semibold text-xs md:text-sm">Estruturação</h3>
        <div className="flex items-center gap-2">
          {isStructuring && (
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Estruturando...</span>
            </div>
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
      
      
      <ScrollArea className="flex-1 p-1.5 md:p-2">
        <div className="space-y-1">
          {/* Filled sections first */}
          {filledSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.key);
            const isEditing = editingSection === section.key;
            const value = structure[section.key];

            return (
              <Collapsible 
                key={section.key}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.key)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-1.5 md:py-2 px-2 md:px-3"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0" />
                    )}
                    <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2 shrink-0 text-primary" />
                    <span className="font-medium text-xs md:text-sm">{section.shortLabel}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground ml-1.5 md:ml-2 truncate flex-1 text-left">
                      {!isExpanded && value}
                    </span>
                  </Button>
                </CollapsibleTrigger>
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
                        className="text-xs md:text-sm p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => setEditingSection(section.key)}
                      >
                        {value || <span className="text-muted-foreground italic">{section.placeholder}</span>}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          
          {/* Empty sections collapsed */}
          {emptySections.length > 0 && (
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
        </div>
      </ScrollArea>
    </div>
  );
}
