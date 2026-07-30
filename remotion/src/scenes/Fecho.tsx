import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";

export const Fecho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const logo = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const line = spring({ frame: frame - 34, fps, config: { damping: 200 } });
  const cta = spring({ frame: frame - 74, fps, config: { damping: 18, stiffness: 120 } });
  const out = interpolate(frame, [durationInFrames - 26, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const pulse = 1 + Math.sin(frame / 22) * 0.012;

  return (
    <AbsoluteFill
      style={{ opacity: out, alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <div
        style={{
          width: interpolate(logo, [0, 1], [0, 120]),
          height: 1,
          background: COLORS.green,
          opacity: 0.6,
          marginBottom: 44,
        }}
      />
      <div
        style={{
          fontFamily: serif,
          fontSize: 104,
          color: COLORS.cream,
          opacity: logo,
          letterSpacing: -1,
          transform: `scale(${pulse})`,
        }}
      >
        MedStation <span style={{ color: COLORS.green }}>AI</span>
      </div>
      <div
        style={{
          fontFamily: serifItalic,
          fontSize: 60,
          color: COLORS.green,
          marginTop: 18,
          opacity: line,
          transform: `translateY(${interpolate(line, [0, 1], [20, 0])}px)`,
        }}
      >
        Compre seu tempo de volta.
      </div>

      <div
        style={{
          marginTop: 66,
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: cta,
          transform: `translateY(${interpolate(cta, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            padding: "18px 34px",
            borderRadius: 999,
            background: COLORS.green,
            fontFamily: sans,
            fontSize: 26,
            color: "#08130D",
          }}
        >
          Comece grátis agora
        </div>
        <div style={{ fontFamily: mono, fontSize: 26, letterSpacing: 2.4, color: COLORS.muted }}>
          medstation-ai.com.br
        </div>
      </div>
    </AbsoluteFill>
  );
};
