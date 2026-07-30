import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

/** Persistent brand atmosphere: deep green vignette + slow drifting glows + fine grid. */
export const Atmosphere: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(durationInFrames, 1);
  const driftA = Math.sin(frame / 190) * 90;
  const driftB = Math.cos(frame / 240) * 120;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(90% 70% at ${28 + driftA / 22}% ${18 + driftB / 40}%, rgba(62,143,104,${0.3 * intensity}) 0%, rgba(8,11,9,0) 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 60% at ${82 - driftB / 26}% ${86 + driftA / 60}%, rgba(143,227,181,${0.13 * intensity}) 0%, rgba(8,11,9,0) 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(143,227,181,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(143,227,181,0.045) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          transform: `translateY(${interpolate(t, [0, 1], [0, -44])}px)`,
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
