import { cn } from "@/lib/utils";
import { LogoMark } from "./LogoMark";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: "h-7 w-7", text: "text-sm", gap: "gap-2" },
  md: { img: "h-10 w-10", text: "text-lg", gap: "gap-3" },
  lg: { img: "h-14 w-14", text: "text-2xl", gap: "gap-3" },
  xl: { img: "h-20 w-20", text: "text-4xl", gap: "gap-4" },
};

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      <LogoMark className={s.img} />
      {showWordmark && (
        <span
          className={cn(
            "font-display font-medium tracking-tight text-foreground leading-none",
            s.text,
          )}
        >
          MedStation
          <span className="font-mono uppercase tracking-[0.18em] text-primary ml-1.5 text-[0.6em] align-middle">
            AI
          </span>
        </span>
      )}
    </div>
  );
}
