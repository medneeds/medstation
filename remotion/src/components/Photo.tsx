import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/**
 * Full-bleed cinematic plate with a slow Ken-Burns move, colour grade
 * toward the brand green and a heavy vignette so type stays legible.
 */
export const Photo: React.FC<{
  src: string;
  focus?: [number, number];
  zoomFrom?: number;
  zoomTo?: number;
  /** 0..1 — how dark the plate is pushed */
  darken?: number;
  panX?: number;
  fadeIn?: number;
}> = ({ src, focus = [0.5, 0.45], zoomFrom = 1.06, zoomTo = 1.16, darken = 0.62, panX = 0, fadeIn = 18 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo]);
  const x = interpolate(frame, [0, durationInFrames], [0, panX]);
  const opacity = interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" });
  const outAt = durationInFrames - 16;
  const fadeOut = interpolate(frame, [outAt, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: opacity * fadeOut }}>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%`,
          transform: `scale(${scale}) translateX(${x}px)`,
          transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
          filter: "saturate(0.72) contrast(1.05)",
        }}
      />
      <AbsoluteFill style={{ background: `rgba(8,11,9,${darken})` }} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(8,11,9,0.92) 0%, rgba(8,11,9,0.55) 42%, rgba(8,11,9,0.18) 72%, rgba(8,11,9,0.6) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 95% at 50% 45%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.78) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "linear-gradient(0deg, rgba(62,143,104,0.14) 0%, rgba(8,11,9,0) 55%)",
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
