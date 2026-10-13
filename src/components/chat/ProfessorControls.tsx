import { GraduationCap } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROFESSOR_STYLES, isProfessorStyle, type ProfessorStyle } from "@/lib/clinicusProfessor";

export function ProfessorControls({ active, style, onActiveChange, onStyleChange, compact = false, disabled = false }: {
  active: boolean;
  style: ProfessorStyle;
  onActiveChange: (active: boolean) => void;
  onStyleChange: (style: ProfessorStyle) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return <>
    <Toggle pressed={active} onPressedChange={onActiveChange} disabled={disabled} size="sm"
      aria-label="Professor" title="Professor clínico"
      className={`shrink-0 rounded-full gap-1 data-[state=on]:bg-primary/20 ${compact ? "h-7 px-2 text-xs" : "h-8 text-xs"}`}>
      <GraduationCap className={compact ? "h-3 w-3" : "h-4 w-4"} />
      <span>Professor</span>
    </Toggle>
    {active && <Select value={style} disabled={disabled} onValueChange={(value) => { if (isProfessorStyle(value)) onStyleChange(value); }}>
      <SelectTrigger aria-label="Estilo do Professor" className={`shrink-0 w-auto max-w-full gap-1.5 rounded-full text-xs ${compact ? "h-7 px-2.5" : "h-8 px-3"}`}>
        <span className="text-muted-foreground">Estilo:</span><SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[80]">
        {PROFESSOR_STYLES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>}
  </>;
}