import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, mono } from "../fonts";
import { Caption } from "../components/Caption";

const TYPED = "Paciente refere dor torácica há 2 dias, em aperto, irradiando para o braço esquerdo…";

export const Virada: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const chars = Math.max(0, Math.min(TYPED.length, Math.floor((frame - 20) * 1.6)));
  const claim = spring({ frame: frame - 96, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  const bars = new Array(28).fill(0).map((_, i) => {
    const h = 10 + Math.abs(Math.sin(frame / 7 + i * 0.55)) * 46 * (chars < TYPED.length ? 1 : 0.25);
    return h;
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 200,
          width: 820,
          padding: 40,
          borderRadius: 10,
          border: `1px solid ${COLORS.line}`,
          background: "rgba(17,24,21,0.78)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              background: "rgba(143,227,181,0.14)",
              border: `1px solid ${COLORS.line}`,
            }}
          />
          <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: 3.6, color: COLORS.muted }}>
            VOCÊ FALA
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60, marginBottom: 34 }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{ width: 6, height: h, borderRadius: 4, background: COLORS.green, opacity: 0.55 }}
            />
          ))}
        </div>
        <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: 3.6, color: COLORS.muted, marginBottom: 16 }}>
          O TEXTO SE ESTRUTURA
        </div>
        <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.4, color: COLORS.cream, minHeight: 150 }}>
          {TYPED.slice(0, chars)}
          <span style={{ opacity: frame % 26 < 13 ? 1 : 0, color: COLORS.green }}>▌</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 120,
          top: 300,
          width: 760,
          textAlign: "right",
          opacity: claim,
          transform: `translateX(${interpolate(claim, [0, 1], [50, 0])}px)`,
        }}
      >
        <div style={{ fontFamily: serif, fontSize: 96, lineHeight: 1.05, color: COLORS.cream }}>
          Produza mais.
        </div>
        <div style={{ fontFamily: serifItalic, fontSize: 96, lineHeight: 1.05, color: COLORS.green }}>
          Digite menos.
        </div>
        <div
          style={{
            marginTop: 28,
            marginLeft: "auto",
            width: interpolate(claim, [0, 1], [0, 300]),
            height: 1,
            background: COLORS.green,
            opacity: 0.5,
          }}
        />
      </div>

      <Caption text="“A MedStation AI existe para uma coisa só: você produzir mais, digitando menos.”" delay={10} />
    </AbsoluteFill>
  );
};
