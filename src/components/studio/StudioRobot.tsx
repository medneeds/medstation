import bodyImg from "@/assets/medstation-robot-body.png";
import headImg from "@/assets/medstation-robot-head.png";
import eyesImg from "@/assets/medstation-robot-eyes.png";

/**
 * MedStation robot for the empty Studio chat. Body, head and eyes are separate
 * layers on the same 400×400 canvas, so the head can tilt around the neck and
 * the eyes can blink. All motion is skipped with prefers-reduced-motion.
 */
export function StudioRobot({ className = "" }: { className?: string }) {
  const layer = "pointer-events-none absolute inset-0 h-full w-full select-none";
  return (
    <div
      role="img"
      aria-label="Robozinho da MedStation"
      className={`relative animate-fade-in drop-shadow-[0_12px_24px_hsl(var(--primary)/0.25)] ${className}`}
    >
      <div className="absolute inset-0 motion-safe:animate-robot-float">
        <img src={bodyImg} alt="" width={400} height={400} draggable={false} className={layer} />
        {/* MedStation peaks on the chest badge (same 400×400 canvas; colors match the illustration, not the theme). */}
        <svg viewBox="0 0 400 400" aria-hidden="true" className={layer}>
          <g transform="translate(182.6 232.4)" strokeLinejoin="round" opacity="0.92">
            <path d="M14 22 L20 11 L26 22 Z" fill="#ffffff" fillOpacity="0.35" stroke="#1f6a50" strokeWidth="1.3" />
            <path d="M6 22 L13 8 L20 22 Z" fill="#f4faf7" stroke="#1f6a50" strokeWidth="1.6" />
          </g>
        </svg>
        <div className="absolute inset-0 origin-[50%_52%] motion-safe:animate-robot-head">
          <img src={headImg} alt="" width={400} height={400} draggable={false} className={layer} />
          <img
            src={eyesImg}
            alt=""
            width={400}
            height={400}
            draggable={false}
            className={`${layer} origin-[50%_35.5%] motion-safe:animate-robot-blink`}
          />
        </div>
      </div>
    </div>
  );
}
