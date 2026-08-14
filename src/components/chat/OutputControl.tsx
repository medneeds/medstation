import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ControlTone = "primary" | "amber" | "blue" | "green" | "violet";

const TONE_ON: Record<ControlTone, string> = {
  primary: "data-[state=on]:bg-primary/15 data-[state=on]:text-primary",
  amber: "data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400",
  blue: "data-[state=on]:bg-blue-500/15 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400",
  green: "data-[state=on]:bg-green-500/15 data-[state=on]:text-green-600 dark:data-[state=on]:text-green-400",
  violet: "data-[state=on]:bg-violet-500/15 data-[state=on]:text-violet-600 dark:data-[state=on]:text-violet-400",
};

export function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`O que faz: ${label}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border/70 text-[9px] font-semibold leading-none text-muted-foreground/80 transition-colors duration-150 hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-60 p-3 text-xs leading-relaxed z-[90]"
      >
        <p className="font-medium text-foreground mb-1">{label}</p>
        <p className="text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

export function OutputControl({
  icon: Icon,
  label,
  info,
  tone,
  pressed,
  onPressedChange,
  compact,
}: {
  icon: React.ElementType;
  label: string;
  info: string;
  tone: ControlTone;
  pressed: boolean;
  onPressedChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center rounded-xl border bg-background/70 transition-colors duration-150 ${
        pressed ? "border-primary/30" : "border-border/50 hover:border-border"
      } ${compact ? "h-7 pr-1.5" : "h-9 pr-2"}`}
    >
      <Toggle
        pressed={pressed}
        onPressedChange={onPressedChange}
        size="sm"
        aria-label={label}
        className={`rounded-xl bg-transparent transition-colors duration-150 ${
          compact ? "h-7 px-2 text-[11px]" : "h-9 px-3 text-xs"
        } ${TONE_ON[tone]}`}
      >
        <Icon className={compact ? "w-3 h-3 mr-1" : "w-3.5 h-3.5 mr-1.5"} />
        <span className="whitespace-nowrap">{label}</span>
      </Toggle>
      <InfoTip text={info} label={label} />
    </div>
  );
}
