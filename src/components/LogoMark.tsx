import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/**
 * MedStation "Clinic OS" monogram.
 *
 * Concept: a precise instrument panel. The mark reads as both an "M"
 * and a stylized ECG/heartbeat trace, anchored by a single mint pulse
 * point. Built from hairline geometry — no gradients, no shadows.
 *
 *  - 32×32 grid, 1px hairline frame, 4px radius (matches --radius)
 *  - Corner registration ticks (top-left / bottom-right) for the
 *    "technical schematic" feel
 *  - Two precise verticals form the "M" stems
 *  - A continuous 1.75px polyline draws the M-peaks AND a flat ECG
 *    baseline that breaks into a single QRS spike
 *  - One mint dot marks the spike apex — the only color in the mark
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

      {/* Registration ticks — top-left & bottom-right */}
      <g
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
        strokeLinecap="square"
      >
        <path d="M3.5 6.5 L3.5 3.5 L6.5 3.5" />
        <path d="M28.5 25.5 L28.5 28.5 L25.5 28.5" />
      </g>

      {/* M stems — precise verticals */}
      <g
        stroke="hsl(var(--foreground))"
        strokeWidth="1.75"
        strokeLinecap="square"
        fill="none"
      >
        <line x1="7.5" y1="9" x2="7.5" y2="20" />
        <line x1="24.5" y1="9" x2="24.5" y2="20" />

        {/* M peaks: left-stem-top → valley → right-stem-top */}
        <polyline points="7.5,9 12,14 16,11 20,14 24.5,9" />
      </g>

      {/* ECG trace — flat baseline with a single QRS spike, mint */}
      <polyline
        points="4,25 11,25 13,25 14,21 15,28 16,23 17,25 28,25"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Pulse dot at the QRS apex */}
      <circle cx="15" cy="28" r="0.9" fill="hsl(var(--primary))" />
    </svg>
  );
}
