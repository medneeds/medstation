import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

const Plan: React.FC<{
  name: string;
  desc: string;
  month: string;
  year: string;
  delay: number;
  featured?: boolean;
  tag?: string;
}> = ({ name, desc, month, year, delay, featured, tag }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 130 } });
  return (
    <div
      style={{
        flex: featured ? 1.14 : 1,
        padding: featured ? "52px 42px" : "44px 38px",
        borderRadius: 14,
        border: `1px solid ${featured ? "rgba(143,227,181,0.48)" : COLORS.line}`,
        background: featured ? "rgba(143,227,181,0.09)" : "rgba(17,24,21,0.74)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
        position: "relative",
      }}
    >
      {tag ? (
        <div
          style={{
            position: "absolute",
            top: -15,
            left: 38,
            padding: "6px 16px",
            borderRadius: 999,
            background: COLORS.green,
            fontFamily: mono,
            fontSize: 13,
            letterSpacing: 2.6,
            color: "#08130D",
          }}
        >
          {tag}
        </div>
      ) : null}
      <div style={{ fontFamily: serif, fontSize: featured ? 46 : 40, color: COLORS.cream }}>{name}</div>
      <div style={{ fontFamily: sans, fontSize: 21, color: COLORS.muted, marginTop: 10, lineHeight: 1.4, minHeight: 60 }}>
        {desc}
      </div>
      <div style={{ height: 1, background: COLORS.line, margin: "22px 0 24px" }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: serif, fontSize: featured ? 62 : 54, color: featured ? COLORS.green : COLORS.cream }}>
          {month}
        </span>
        <span style={{ fontFamily: sans, fontSize: 22, color: COLORS.muted }}>/mês</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 17, color: COLORS.muted, marginTop: 12, letterSpacing: 1.6 }}>
        ou {year}/ano
      </div>
    </div>
  );
};

export const Planos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const anchor = spring({ frame: frame - 210, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, padding: "0 110px", justifyContent: "center", paddingBottom: 140 }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.green, opacity: t }}>
        PLANOS
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 62,
          color: COLORS.cream,
          marginTop: 18,
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
        }}
      >
        Assine só o que você usa —{" "}
        <span style={{ fontFamily: serifItalic, color: COLORS.green }}>ou os dois juntos.</span>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 54, alignItems: "stretch" }}>
        <Plan name="Assistentes" desc="Os 10 assistentes clínicos" month="R$ 29,90" year="R$ 299,90" delay={34} />
        <Plan
          name="Os dois"
          desc="Assistentes + Modo Consultório"
          month="R$ 49,90"
          year="R$ 499,90"
          delay={50}
          featured
          tag="RECOMENDADO"
        />
        <Plan name="Consultório" desc="Gravação e estruturação em tempo real" month="R$ 29,90" year="R$ 299,90" delay={66} />
      </div>

      <div
        style={{
          marginTop: 46,
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: anchor,
          transform: `translateY(${interpolate(anchor, [0, 1], [18, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 17,
            letterSpacing: 3,
            color: COLORS.green,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 999,
            padding: "12px 22px",
          }}
        >
          MENOS DE R$ 300 PELO ANO INTEIRO
        </span>
        <span style={{ fontFamily: sans, fontSize: 27, color: COLORS.muted }}>
          Menos do que você ganha em quatro horas de plantão.
        </span>
      </div>

      <Caption
        text="“Vinte e nove e noventa por mês. Os dois juntos, quarenta e nove e noventa. Menos de trezentos reais pelo ano.”"
        delay={16}
        align="center"
      />
    </AbsoluteFill>
  );
};
