import { cn } from "@/lib/utils";

/**
 * Glass "clinical" glyph for assistant icons.
 * Depth via layered gradients + inner light, motion via slow float and travelling sheen.
 * Colors stay on the sage/green brand token — no hardcoded colors.
 */
export function AssistantGlyph({
  children,
  size = "md",
  className,
  animate = true,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
}) {
  const pad = size === "sm" ? "p-1.5 md:p-2" : size === "lg" ? "p-4 md:p-6" : "p-2.5 md:p-3";
  const radius = size === "lg" ? "rounded-full" : "rounded-xl";

  return (
    <span className={cn("relative inline-flex shrink-0", animate && "animate-orb-float", className)}>
      {/* Ambient glow behind the glass */}
      <span
        className={cn(
          "pointer-events-none absolute -inset-2 blur-xl bg-primary/20",
          radius,
          animate && "animate-orb-shimmer"
        )}
      />
      {/* Glass body */}
      <span
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden",
          radius,
          pad,
          "text-primary",
          "bg-gradient-to-br from-primary/25 via-primary/10 to-transparent",
          "ring-1 ring-primary/25 backdrop-blur-md",
          "shadow-[inset_0_1px_0_hsl(var(--primary)/0.35),inset_0_-8px_16px_-8px_hsl(var(--primary)/0.35),0_8px_20px_-12px_hsl(var(--primary)/0.5)]",
          animate && "animate-orb-breathe"
        )}
      >
        {/* Top specular highlight */}
        <span
          className={cn("pointer-events-none absolute inset-x-0 -top-1/2 h-full bg-gradient-to-b from-primary/25 to-transparent", radius)}
        />
        {/* Travelling sheen */}
        {animate && (
          <span
            className="pointer-events-none absolute inset-0 animate-glyph-sheen"
            style={{
              background:
                "linear-gradient(115deg, transparent 35%, hsl(var(--primary) / 0.35) 50%, transparent 65%)",
              backgroundSize: "250% 100%",
            }}
          />
        )}
        <span className="relative z-10 block [&>svg]:relative [&>svg]:stroke-[1.6] [&>svg]:drop-shadow-[0_1px_2px_hsl(var(--primary)/0.45)]">
          {children}
        </span>
      </span>
    </span>
  );
}
