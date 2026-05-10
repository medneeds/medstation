import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/**
 * Geometric, hairline monogram for the "Clinic OS" identity.
 * - Square frame with 4px radius (matches --radius)
 * - 1px hairline border
 * - "M" formed by precise verticals + a centered medical cross
 * - Mint/sage accent on the cross only — restrained and technical
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

      {/* Corner registration tick (mono / technical feel) */}
      <path
        d="M4 7 L4 4 L7 4"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M28 25 L28 28 L25 28"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        fill="none"
        opacity="0.55"
      />

      {/* "M" — three precise verticals + diagonals */}
      <g
        stroke="hsl(var(--foreground))"
        strokeWidth="1.75"
        strokeLinecap="square"
        fill="none"
      >
        <line x1="9" y1="9" x2="9" y2="23" />
        <line x1="23" y1="9" x2="23" y2="23" />
        <line x1="9" y1="9" x2="16" y2="16" />
        <line x1="23" y1="9" x2="16" y2="16" />
      </g>

      {/* Medical cross — mint accent, sits inside the M valley */}
      <g fill="hsl(var(--primary))">
        <rect x="15" y="18" width="2" height="6" rx="0.5" />
        <rect x="13" y="20" width="6" height="2" rx="0.5" />
      </g>
    </svg>
  );
}
