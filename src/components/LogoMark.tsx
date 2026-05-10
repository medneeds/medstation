import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/**
 * MedStation monogram — an "M" formed by two mountain peaks.
 * Single element, no secondary trace. Hairline frame, mint accent
 * on the smaller back peak to add depth without breaking minimalism.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      aria-hidden="true"
    >
      {/* Frame */}
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="3.5"
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        strokeWidth="1"
      />

      {/* Registration ticks */}
      <g
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        fill="none"
        opacity="0.45"
        strokeLinecap="square"
      >
        <path d="M3.5 6.5 L3.5 3.5 L6.5 3.5" />
        <path d="M28.5 25.5 L28.5 28.5 L25.5 28.5" />
      </g>

      {/* Back peak — mint, slightly smaller, offset right */}
      <path
        d="M14 22 L20 11 L26 22 Z"
        fill="hsl(var(--primary) / 0.22)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.25"
        strokeLinejoin="miter"
      />

      {/* Front peak — foreground, taller, anchors the "M" */}
      <path
        d="M6 22 L13 8 L20 22 Z"
        fill="hsl(var(--card))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.75"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
