import { motion, useReducedMotion } from "framer-motion";

/**
 * Discreet logo elements (the two peaks and the registration ticks of the
 * MedStation mark) drifting along the vertical divider of the login page.
 * Purely decorative: no pointer events, hidden from assistive tech.
 */

type Peak = { top: string; size: number; dx: number; duration: number; delay: number; back?: boolean };

const FLOATERS: Peak[] = [
  { top: "12%", size: 22, dx: -18, duration: 16, delay: 0 },
  { top: "30%", size: 14, dx: 14, duration: 19, delay: 2.5, back: true },
  { top: "52%", size: 18, dx: -10, duration: 21, delay: 1.2 },
  { top: "70%", size: 12, dx: 20, duration: 17, delay: 4, back: true },
  { top: "86%", size: 20, dx: 8, duration: 23, delay: 0.6 },
];

function FrontPeak({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 22 L13 8 L20 22 Z" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M14 22 L20 11 L26 22 Z" stroke="hsl(var(--primary))" strokeWidth="1.25" fill="hsl(var(--primary) / 0.18)" />
    </svg>
  );
}

function BackPeak({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 24 L16 9 L24 24 Z" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="hsl(var(--primary) / 0.15)" />
    </svg>
  );
}

export function AuthDividerMarks() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-56 -translate-x-1/2 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
    >
      {/* Hairline with a slow light travelling along it */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-hairline" />
      {!reduce && (
        <motion.div
          className="absolute left-1/2 h-40 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/60 to-transparent"
          initial={{ top: "-20%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
        />
      )}

      {/* Large faint monogram anchored on the divider, breathing slowly */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        animate={reduce ? undefined : { scale: [1, 1.04, 1], rotate: [0, 1.5, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="200" height="200" viewBox="0 0 32 32" fill="none">
          <g stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeLinecap="square">
            <path d="M3.5 6.5 L3.5 3.5 L6.5 3.5" />
            <path d="M28.5 25.5 L28.5 28.5 L25.5 28.5" />
          </g>
          <motion.path
            d="M14 22 L20 11 L26 22 Z"
            stroke="hsl(var(--primary))"
            strokeWidth="0.6"
            fill="hsl(var(--primary) / 0.25)"
            animate={reduce ? undefined : { x: [0, 1.2, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <path d="M6 22 L13 8 L20 22 Z" stroke="hsl(var(--foreground))" strokeWidth="0.75" />
        </svg>
      </motion.div>

      {/* Small peaks drifting up and sideways along the line */}
      {FLOATERS.map((p, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2"
          style={{ top: p.top, marginLeft: -p.size / 2 }}
          initial={{ opacity: 0.12 }}
          animate={
            reduce
              ? undefined
              : { y: [0, -36, 0], x: [0, p.dx, 0], opacity: [0.08, 0.22, 0.08], rotate: [0, p.dx > 0 ? 6 : -6, 0] }
          }
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          {p.back ? <BackPeak size={p.size} /> : <FrontPeak size={p.size} />}
        </motion.div>
      ))}

      {/* Registration ticks framing the divider */}
      <motion.svg
        className="absolute left-1/2 top-[22%] -translate-x-1/2"
        width="56"
        height="56"
        viewBox="0 0 32 32"
        fill="none"
        animate={reduce ? undefined : { opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M3.5 9.5 L3.5 3.5 L9.5 3.5" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeLinecap="square" />
      </motion.svg>
      <motion.svg
        className="absolute left-1/2 top-[74%] -translate-x-1/2"
        width="56"
        height="56"
        viewBox="0 0 32 32"
        fill="none"
        animate={reduce ? undefined : { opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 8, delay: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M28.5 22.5 L28.5 28.5 L22.5 28.5" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeLinecap="square" />
      </motion.svg>
    </div>
  );
}
