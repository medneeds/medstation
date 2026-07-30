import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

const Card: React.FC<{ kicker: string; title: string; body: string; delay: number; accent?: boolean }> = ({
  kicker,
  title,
  body,
  delay,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 120 } });
  return (
    <div
      style={{
        flex: 1,
        padding: "40px 36px",
        borderRadius: 14,
        border: `1px solid ${accent ? "rgba(232,178,122,0.44)" : COLORS.line}`,
        background: accent ? "rgba(232,178,122,0.07)" : "rgba(17,24,21,0.76)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [44, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 4, color: accent ? COLORS.alert : COLORS.green }}>
        {kicker}
      </div>
      <div style={{ fontFamily: serif, fontSize: 42, color: COLORS.cream, marginTop: 16, lineHeight: 1.1 }}>{title}</div>
      <div style={{ fontFamily: sans, fontSize: 23, color: COLORS.muted, marginTop: 14, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
};

export const Garantia: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const pulse = 0.55 + Math.sin(frame / 12) * 0.2;
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, padding: "0 110px", justifyContent: "center", paddingBottom: 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: k }}>
        <div style={{ width: 10, height: 10, borderRadius: 10, background: COLORS.alert, opacity: pulse }} />
        <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.alert }}>
          PREÇO DE LANÇAMENTO
        </div>
      </div>

      <div
        style={{
          fontFamily: serif,
          fontSize: 66,
          color: COLORS.cream,
          marginTop: 20,
          maxWidth: 1500,
          lineHeight: 1.08,
          opacity: k,
          transform: `translateY(${interpolate(k, [0, 1], [20, 0])}px)`,
        }}
      >
        Eu não sei por quanto tempo consigo segurar esse valor —{" "}
        <span style={{ fontFamily: serifItalic, color: COLORS.green }}>sinceramente, não sei.</span>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 52 }}>
        <Card
          kicker="ENQUANTO DURAR"
          title="Preço congelado"
          body="Quem entra agora mantém esse valor enquanto a assinatura estiver ativa. Se subir, sobe só para quem chegar depois."
          delay={40}
          accent
        />
        <Card
          kicker="RISCO ZERO"
          title="7 dias de garantia"
          body="Testa num plantão, testa numa semana de consultório. Se não te devolver tempo, você pede o dinheiro de volta. Sem pergunta."
          delay={58}
        />
        <Card
          kicker="ENTRADA LIVRE"
          title="Examinus é grátis"
          body="Todo médico cadastrado interpreta exames sem pagar nada. Você testa a plataforma antes de decidir qualquer coisa."
          delay={76}
        />
      </div>

      <Caption
        text="“Esse é o preço de lançamento. Quem entra agora, congela. E ainda tem sete dias de garantia incondicional.”"
        delay={18}
        align="center"
      />
    </AbsoluteFill>
  );
};
