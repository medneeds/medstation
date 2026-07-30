import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { mono } from "../fonts";

/**
 * Real product capture inside a restrained window chrome, with a slow
 * Ken-Burns move so the frame is never static.
 */
export const ProductFrame: React.FC<{
  src: string;
  label: string;
  /** normalized focus point 0..1 */
  focus?: [number, number];
  zoomFrom?: number;
  zoomTo?: number;
  width?: number;
  height?: number;
  delay?: number;
}> = ({
  src,
  label,
  focus = [0.5, 0.4],
  zoomFrom = 1.0,
  zoomTo = 1.07,
  width = 1240,
  height = 720,
  delay = 6,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.9 } });
  const scale = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp",
  });
  const drift = Math.sin(frame / 90) * 6;

  return (
    <div
      style={{
        width,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${COLORS.line}`,
        background: COLORS.panel,
        boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.975, 1],
        )})`,
      }}
    >
      <div
        style={{
          height: 42,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
          background: "rgba(255,255,255,0.025)",
        }}
      >
        {["#3B4741", "#3B4741", "#3B4741"].map((c, i) => (
          <div key={i} style={{ width: 9, height: 9, borderRadius: 9, background: c }} />
        ))}
        <span
          style={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: 2.4,
            color: COLORS.muted,
            marginLeft: 16,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ height, overflow: "hidden", position: "relative" }}>
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${focus[0] * 100}% ${Math.max(0, Math.min(100, focus[1] * 100 + drift * 0.35))}%`,
            transform: `scale(${scale})`,
            transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
          }}
        />


      </div>
    </div>
  );
};
