import { LogoMark } from "@/components/LogoMark";

/**
 * Animated "thinking" indicator featuring the MedStation logo.
 * - The logo gently pulses and rotates slightly to feel "alive".
 * - A soft halo breathes behind it (primary color) signaling AI processing.
 * - Three dots animate after "Pensando" for additional motion cue.
 */
export function ThinkingIndicator({ label = "Pensando" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <span className="relative inline-flex h-7 w-7 items-center justify-center">
        {/* Breathing halo */}
        <span className="absolute inset-0 rounded-md bg-primary/30 blur-md animate-thinking-halo" />
        <span className="absolute inset-0 rounded-md bg-primary/20 animate-thinking-halo [animation-delay:-0.6s]" />
        {/* Logo with subtle wobble */}
        <span className="relative inline-block animate-thinking-logo">
          <LogoMark className="h-7 w-7" />
        </span>
      </span>
      <span className="text-sm text-muted-foreground inline-flex items-baseline">
        <span>{label}</span>
        <span className="ml-0.5 inline-flex">
          <span className="animate-thinking-dot">.</span>
          <span className="animate-thinking-dot [animation-delay:0.18s]">.</span>
          <span className="animate-thinking-dot [animation-delay:0.36s]">.</span>
        </span>
      </span>
    </div>
  );
}
