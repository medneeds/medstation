import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Photo } from "../components/Photo";
import { Caption } from "../components/Caption";

export const Fecho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const a = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const b = spring({ frame: frame - 60, fps, config: { damping: 20, stiffness: 110 } });
  const c = spring({ frame: frame - 120, fps, config: { damping: 200 } });
  const line = interpolate(frame, [40, 120], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 26, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Photo src="images/scene_family.jpg" focus={[0.55, 0.4]} zoomFrom={1.14} zoomTo={1.02} darken={0.78} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 130 }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 36,
              color: COLORS.muted,
              opacity: a,
              transform: `translateY(${interpolate(a, [0, 1], [18, 0])}px)`,
            }}
          >
            O tempo que você não vai recuperar é o de hoje.
          </div>

          <div style={{ width: interpolate(line, [0, 1], [0, 520]), height: 1, background: COLORS.green, opacity: 0.5, margin: "34px auto" }} />

          <div
            style={{
              fontFamily: serif,
              fontSize: 104,
              color: COLORS.cream,
              opacity: b,
              transform: `scale(${interpolate(b, [0, 1], [0.95, 1])})`,
              lineHeight: 1.06,
            }}
          >
            Crie sua conta e teste hoje.
            <br />
            <span style={{ fontFamily: serifItalic, color: COLORS.green }}>O Examinus é grátis.</span>
          </div>

          <div
            style={{
              marginTop: 44,
              display: "inline-flex",
              alignItems: "center",
              gap: 18,
              padding: "18px 34px",
              borderRadius: 999,
              border: `1px solid ${COLORS.line}`,
              background: "rgba(143,227,181,0.08)",
              opacity: c,
              transform: `translateY(${interpolate(c, [0, 1], [16, 0])}px)`,
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 20, letterSpacing: 4, color: COLORS.green }}>
              MEDSTATION-AI.LOVABLE.APP
            </span>
          </div>

          <div style={{ marginTop: 40, fontFamily: serifItalic, fontSize: 46, color: COLORS.cream, opacity: c }}>
            Produza mais. Digite menos.
          </div>
        </div>
      </AbsoluteFill>

      <Caption
        text="“Crie sua conta agora, teste de graça e veja quanto tempo volta pra você já na primeira semana.”"
        delay={20}
        align="center"
      />
    </AbsoluteFill>
  );
};
