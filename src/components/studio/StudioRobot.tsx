import { useEffect, useState } from "react";
import bodyImg from "@/assets/medstation-robot-body.png";
import headImg from "@/assets/medstation-robot-head.png";
import eyesImg from "@/assets/medstation-robot-eyes.png";
import laptopImg from "@/assets/medstation-robot-laptop.webp";
import tabletImg from "@/assets/medstation-robot-tablet.webp";
import thinkingImg from "@/assets/medstation-robot-thinking.webp";
import walkingImg from "@/assets/medstation-robot-walking.webp";

/** Scene order; the first one is the animated waving robot. */
const SCENES = ["idle", "laptop", "tablet", "thinking", "walking"] as const;
type Scene = (typeof SCENES)[number];
const SCENE_MS = 6500;

const POSES: Record<Exclude<Scene, "idle">, { src: string; label: string; motion: string; inner?: string }> = {
  laptop: { src: laptopImg, label: "digitando no notebook", motion: "animate-robot-type" },
  tablet: { src: tabletImg, label: "mexendo no tablet", motion: "animate-robot-float" },
  thinking: { src: thinkingImg, label: "pensativo", motion: "origin-bottom animate-robot-ponder" },
  walking: { src: walkingImg, label: "caminhando", motion: "animate-robot-walk", inner: "animate-robot-step" },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * MedStation robot for the empty Studio chat. It alternates between scenes
 * (waving, typing on a laptop, using a tablet, thinking, walking) with a soft
 * crossfade. The waving scene keeps body, head and eyes as separate layers on
 * the same canvas so the head can tilt and the eyes blink. With
 * prefers-reduced-motion only the still waving robot is shown.
 */
export function StudioRobot({ className = "" }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) {
      setIndex(0);
      return;
    }
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  const scene = SCENES[index];
  const layer = "pointer-events-none absolute inset-0 h-full w-full select-none";
  const fade = "absolute inset-0 transition-opacity duration-700 ease-in-out";

  return (
    <div
      role="img"
      aria-label={`Robozinho da MedStation${scene === "idle" ? "" : ` ${POSES[scene].label}`}`}
      className={`relative animate-fade-in drop-shadow-[0_12px_24px_hsl(var(--primary)/0.25)] ${className}`}
    >
      <div className={`${fade} ${scene === "idle" ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-0 motion-safe:animate-robot-float">
          <img src={bodyImg} alt="" width={400} height={400} draggable={false} className={layer} />
          {/* MedStation peaks on the chest badge (same 400×400 canvas; colors match the illustration, not the theme). */}
          <svg viewBox="0 0 400 400" aria-hidden="true" className={layer}>
            <g transform="translate(182.6 232.4)" strokeLinejoin="round" fill="none" stroke="#ffffff">
              <path d="M14 22 L20 11 L26 22 Z" strokeWidth="1.6" />
              <path d="M6 22 L13 8 L20 22 Z" strokeWidth="1.8" />
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

      {!reduced &&
        (Object.keys(POSES) as Array<keyof typeof POSES>).map((key) => {
          const pose = POSES[key];
          const active = scene === key;
          return (
            <div key={key} className={`${fade} ${active ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
              {/* Motion classes only while active, so walking starts from the left each time. */}
              <div className={`absolute inset-0 ${active ? pose.motion : ""}`}>
                <img
                  src={pose.src}
                  alt=""
                  width={600}
                  height={600}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className={`${layer} ${active && pose.inner ? pose.inner : ""}`}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}
