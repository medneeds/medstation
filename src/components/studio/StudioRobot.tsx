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
