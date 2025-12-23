import { Stethoscope, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeakerType } from "@/hooks/useConsultation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SpeakerIndicatorProps {
  speaker: SpeakerType;
  confidence: number;
  timestamp: Date;
  onChangeSpeaker: (newSpeaker: SpeakerType) => void;
  isEditable?: boolean;
}

const speakerConfig = {
  doctor: {
    label: 'Médico',
    icon: Stethoscope,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  patient: {
    label: 'Paciente',
    icon: User,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  companion: {
    label: 'Acompanhante',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

const confidenceConfig = {
  high: { color: 'bg-green-500', label: 'Alta confiança' },
  medium: { color: 'bg-yellow-500', label: 'Média confiança' },
  low: { color: 'bg-red-500', label: 'Baixa confiança' },
};

function getConfidenceLevel(confidence: number) {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function SpeakerIndicator({ 
  speaker, 
  confidence, 
  timestamp,
  onChangeSpeaker,
  isEditable = true,
}: SpeakerIndicatorProps) {
  const config = speakerConfig[speaker];
  const Icon = config.icon;
  const confidenceLevel = getConfidenceLevel(confidence);
  const confConfig = confidenceConfig[confidenceLevel];
  
  const timeStr = timestamp.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
  });

  if (!isEditable) {
    return (
      <div className={cn("flex items-center gap-2 px-2 py-1 rounded-lg", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
        <span className="text-xs text-muted-foreground">({timeStr})</span>
        <div 
          className={cn("w-2 h-2 rounded-full", confConfig.color)}
          title={confConfig.label}
        />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn("h-auto py-1 px-2 gap-2", config.bg, "hover:opacity-80")}
        >
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
          <span className="text-xs text-muted-foreground">({timeStr})</span>
          <div 
            className={cn("w-2 h-2 rounded-full", confConfig.color)}
            title={confConfig.label}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {Object.entries(speakerConfig).map(([key, value]) => {
          const ItemIcon = value.icon;
          return (
            <DropdownMenuItem 
              key={key}
              onClick={() => onChangeSpeaker(key as SpeakerType)}
              className={cn(speaker === key && "bg-accent")}
            >
              <ItemIcon className={cn("h-4 w-4 mr-2", value.color)} />
              <span>{value.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
