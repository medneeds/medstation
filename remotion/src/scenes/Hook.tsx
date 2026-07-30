import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

const Line: React.FC<{ text: string; delay: number; dim?: boolean }> = ({ text, delay, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        overflow: "hidden",
        height: 74,
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: sans,
          fontSize: 44,
          color: dim ? COLORS.muted : COLORS.cream,
          transform: `translateY(${interpolate(s, [0, 1], [70, 0])}px)`,
          opacity: s,
          letterSpacing: -0.6,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const q = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const caret = frame % 30 < 16 ? 1 : 0.1;
  const clock = 22 * 60 + 40 + Math.floor(frame / 12);
  const hh = String(Math.floor(clock / 60)).padStart(2, "0");
  const mm = String(clock % 60).padStart(2, "0");
  const out = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: "absolute",
          top: 74,
          right: 120,
          fontFamily: mono,
          fontSize: 22,
          letterSpacing: 5,
          color: COLORS.muted,
        }}
      >
        {hh}:{mm} · PLANTÃO
      </div>

      <div style={{ position: "absolute", left: 120, top: 236, width: 1340 }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 19,
            letterSpacing: 6,
            color: COLORS.green,
            opacity: q * 0.9,
            marginBottom: 34,
          }}
        >
          — PARA MÉDICOS OCUPADOS
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 108,
            lineHeight: 1.03,
            color: COLORS.cream,
            opacity: q,
            transform: `translateY(${interpolate(q, [0, 1], [34, 0])}px)`,
            maxWidth: 1300,
          }}
        >
          Quantas horas por semana você passa digitando
          <br />
          <span style={{ color: COLORS.green }}>o que já sabe de cabeça?</span>
          <span style={{ opacity: caret, color: COLORS.green }}>|</span>
        </div>

        <div style={{ marginTop: 70, borderLeft: `1px solid ${COLORS.line}`, paddingLeft: 30 }}>
          <Line text="8 minutos por anamnese." delay={58} />
          <Line text="Todo dia." delay={78} dim />
          <Line text="Toda semana." delay={96} dim />
        </div>
      </div>

      <Caption text="“Quantas horas por semana você passa digitando o que já sabe de cabeça?”" delay={20} />
    </AbsoluteFill>
  );
};
