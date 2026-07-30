import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";
import { ProductFrame } from "../components/ProductFrame";

export const Gratis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const badge = spring({ frame: frame - 52, fps, config: { damping: 14, stiffness: 130 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          gap: 70,
          padding: "0 110px",
          paddingBottom: 120,
        }}
      >
        <ProductFrame src="images/signup.png" label="Cadastro · medstation-ai.com.br" focus={[0.62, 0.45]} width={1060} height={620}  />
        <div style={{ width: 540 }}>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5, color: COLORS.green }}>
            ENTRADA SEM RISCO
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 72,
              lineHeight: 1.06,
              color: COLORS.cream,
              marginTop: 22,
              opacity: t,
              transform: `translateY(${interpolate(t, [0, 1], [26, 0])}px)`,
            }}
          >
            Cadastro grátis.
            <br />
            <span style={{ fontFamily: serifItalic, color: COLORS.green }}>Examinus liberado.</span>
          </div>
          <div
            style={{
              marginTop: 34,
              fontFamily: sans,
              fontSize: 27,
              lineHeight: 1.5,
              color: COLORS.muted,
              opacity: t,
            }}
          >
            Poucos campos. Nenhum cartão.
            <br />
            Você testa antes de decidir qualquer coisa.
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              marginTop: 42,
              padding: "16px 26px",
              borderRadius: 999,
              border: `1px solid rgba(143,227,181,0.4)`,
              background: "rgba(143,227,181,0.1)",
              opacity: badge,
              transform: `scale(${interpolate(badge, [0, 1], [0.9, 1])})`,
            }}
          >
            <span style={{ fontFamily: mono, fontSize: 17, letterSpacing: 3, color: COLORS.green }}>
              SEM CARTÃO DE CRÉDITO
            </span>
          </div>
        </div>
      </div>
      <Caption
        text="“Você não precisa decidir agora. Crie sua conta e use o Examinus de graça, sem cartão.”"
        delay={12}
        align="center"
      />
    </AbsoluteFill>
  );
};
