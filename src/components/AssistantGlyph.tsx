import { cn } from "@/lib/utils";

type GlyphSize = "xs" | "sm" | "md" | "lg";

const PAD: Record<GlyphSize, string> = {
  xs: "p-1",
  sm: "p-1.5 md:p-2",
  md: "p-2.5 md:p-3",
  lg: "p-4 md:p-6",
};

const RADIUS: Record<GlyphSize, string> = {
  xs: "rounded-[0.45rem]",
  sm: "rounded-xl",
  md: "rounded-xl",
  lg: "rounded-full",
};

/**
 * Glass "clinical" glyph for assistant icons.
 * Depth comes from layered gradients, a top light edge, a darker contact base
 * and an outer green drop shadow. Motion stays discreet (float + slow sheen).
 * Colors always derive from the --primary brand token.
 */
export function AssistantGlyph({
  children,
  size = "md",
  className,
  animate = true,
  interactive = false,
}: {
  children: React.ReactNode;
  size?: GlyphSize;
  className?: string;
  animate?: boolean;
  interactive?: boolean;
}) {
  const radius = RADIUS[size];
  const isLarge = size === "lg";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 [perspective:600px]",
        interactive && "group/glyph",
        animate && "animate-orb-float",
        className,
      )}
    >
      {/* Ambient halo */}
      <span
        className={cn(
          "pointer-events-none absolute blur-xl bg-primary/20",
          size === "xs" ? "-inset-1" : "-inset-2",
          radius,
          animate && "animate-orb-shimmer",
        )}
      />
      {/* Second, wider ring for the big orb */}
      {isLarge && (
        <>
          <span className="pointer-events-none absolute -inset-1 rounded-full ring-1 ring-primary/15" />
          <span className="pointer-events-none absolute -inset-4 rounded-full ring-1 ring-primary/10" />
        </>
      )}

      {/* Glass body */}
      <span
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden text-primary",
          radius,
          PAD[size],
          "bg-[linear-gradient(150deg,hsl(var(--primary)/0.32)_0%,hsl(var(--primary)/0.12)_42%,hsl(var(--primary)/0.04)_70%,transparent_100%)]",
          "backdrop-blur-md border border-primary/25 border-t-primary/45 border-b-primary/15",
          // layered depth: inner top light, inner bottom shade, outer contact shadow
          size === "xs"
            ? "shadow-[inset_0_1px_0_hsl(var(--primary)/0.4),inset_0_-4px_8px_-6px_hsl(var(--primary)/0.5),0_3px_8px_-5px_hsl(var(--primary)/0.55)]"
            : "shadow-[inset_0_1.5px_0_hsl(var(--primary)/0.45),inset_0_-10px_18px_-10px_hsl(var(--primary)/0.55),0_10px_22px_-14px_hsl(var(--primary)/0.65),0_2px_6px_-4px_hsl(var(--primary)/0.4)]",
          "transition-[transform,box-shadow] duration-300 ease-precise",
          interactive &&
            "group-hover/glyph:[transform:rotateX(10deg)_rotateY(-10deg)_translateY(-1px)] group-hover/glyph:shadow-[inset_0_1.5px_0_hsl(var(--primary)/0.55),inset_0_-12px_20px_-10px_hsl(var(--primary)/0.6),0_14px_26px_-14px_hsl(var(--primary)/0.75)]",
        )}
      >
        {/* Fixed specular highlight (top-left light source) */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0",
            radius,
            "bg-[radial-gradient(120%_80%_at_18%_0%,hsl(var(--primary)/0.35)_0%,transparent_58%)]",
          )}
        />
        {/* Contact shade at the base */}
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-1/2",
            "bg-[linear-gradient(to_top,hsl(var(--primary)/0.18),transparent)]",
          )}
        />
        {/* Travelling sheen — subtle */}
        {animate && (
          <span
            className="pointer-events-none absolute inset-0 animate-glyph-sheen opacity-70"
            style={{
              background:
                "linear-gradient(115deg, transparent 38%, hsl(var(--primary) / 0.28) 50%, transparent 62%)",
              backgroundSize: "250% 100%",
            }}
          />
        )}
        {/* Icon lifted above the plate */}
        <span className="relative z-10 block [&>svg]:stroke-[1.5] [&>svg]:drop-shadow-[0_1.5px_2px_hsl(var(--primary)/0.5)]">
          {children}
        </span>
      </span>
    </span>
  );
}
