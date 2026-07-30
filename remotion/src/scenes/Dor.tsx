import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Photo } from "../components/Photo";
import { Caption } from "../components/Caption";

const Beat: React.FC<{ text: string; delay: number; dim?: boolean }> = ({ text, delay, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ overflow: "hidden", height: 72, display: "flex", alignItems: "center" }}>
      <span
        style={{
          fontFamily: sans,
          fontSize: 42,
          letterSpacing: -0.5,
          color: dim ? COLORS.muted : COLORS.cream,
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [66, 0])}px)`,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const Dor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const swap = frame > 190;
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      {swap ? (
        <Photo src="images/scene_emergency.jpg" focus={[0.55, 0.4]} zoomFrom={1.08} zoomTo={1.18} darken={0.6} fadeIn={22} />
      ) : (
        <Photo src="images/scene_typing.jpg" focus={[0.7, 0.5]} zoomFrom={1.14} zoomTo={1.05} darken={0.66} />
      )}

      <div style={{ position: "absolute", left: 110, top: 200, width: 1220 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: 6, color: COLORS.green, opacity: k }}>
          — A CONTA QUE NINGUÉM FAZ
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 82,
            lineHeight: 1.06,
            color: COLORS.cream,
            marginTop: 26,
            opacity: k,
            transform: `translateY(${interpolate(k, [0, 1], [26, 0])}px)`,
          }}
        >
          Você estudou anos para cuidar de gente.
          <br />
          <span style={{ color: COLORS.green }}>Não para preencher formulário.</span>
        </div>

        <div style={{ marginTop: 54, borderLeft: `1px solid ${COLORS.line}`, paddingLeft: 30 }}>
          <Beat text="Anamnese: 8 minutos." delay={110} />
          <Beat text="Evolução, prescrição, atestado, orientação." delay={148} dim />
          <Beat text="Multiplique por cada paciente. Por cada plantão." delay={192} dim />
        </div>
      </div>

      <Caption
        text="“Você estudou anos para cuidar de gente — não para preencher formulário. Oito minutos por anamnese, paciente após paciente.”"
        delay={24}
      />
    </AbsoluteFill>
  );
};
