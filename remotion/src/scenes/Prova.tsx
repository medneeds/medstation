import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

const Stat: React.FC<{
  kicker: string;
  value: string;
  unit?: string;
  note: string;
  delay: number;
  highlight?: boolean;
}> = ({ kicker, value, unit, note, delay, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        flex: 1,
        padding: "46px 40px",
        borderRadius: 10,
        border: `1px solid ${highlight ? "rgba(143,227,181,0.4)" : COLORS.line}`,
        background: highlight ? "rgba(143,227,181,0.07)" : "rgba(17,24,21,0.7)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 4.5, color: COLORS.muted }}>{kicker}</div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 92,
          lineHeight: 1.1,
          marginTop: 18,
          color: highlight ? COLORS.green : COLORS.cream,
        }}
      >
        {value}
        {unit ? <span style={{ fontSize: 42, marginLeft: 10, fontFamily: sans }}>{unit}</span> : null}
      </div>
      <div style={{ fontFamily: sans, fontSize: 23, color: COLORS.muted, marginTop: 14, lineHeight: 1.4 }}>
        {note}
      </div>
    </div>
  );
};

export const Prova: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const title = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const arrow = spring({ frame: frame - 46, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: out, padding: "0 120px", justifyContent: "center", paddingBottom: 120 }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.green, opacity: title }}>
        QUANTO TEMPO VOCÊ GANHA
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 78,
          color: COLORS.cream,
          marginTop: 22,
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [22, 0])}px)`,
        }}
      >
        8 min digitando{" "}
        <span style={{ color: COLORS.green, opacity: arrow }}>→</span>{" "}
        <span style={{ fontStyle: "italic", color: COLORS.green }}>30 seg falando</span>
      </div>

      <div style={{ display: "flex", gap: 26, marginTop: 62 }}>
        <Stat kicker="SEM MEDSTATION" value="8" unit="min" note="digitando a anamnese, paciente por paciente" delay={30} />
        <Stat kicker="COM MEDSTATION" value="30" unit="seg" note="falando — a anamnese sai pronta" delay={46} highlight />
        <Stat kicker="EM 1 MÊS DE TRABALHO" value="40" unit="h" note="de volta para você, sua família, seu descanso" delay={62} />
      </div>

      <Caption
        text="“Oito minutos digitando viram trinta segundos falando. No fim do mês, até quarenta horas de volta para você.”"
        delay={16}
        align="center"
      />
    </AbsoluteFill>
  );
};
