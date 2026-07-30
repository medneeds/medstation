import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Photo } from "../components/Photo";
import { Caption } from "../components/Caption";

const Cost: React.FC<{ value: string; unit: string; note: string; delay: number; accent?: boolean }> = ({
  value,
  unit,
  note,
  delay,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        flex: 1,
        padding: "40px 34px",
        borderRadius: 12,
        border: `1px solid ${accent ? "rgba(232,178,122,0.42)" : COLORS.line}`,
        background: accent ? "rgba(232,178,122,0.07)" : "rgba(17,24,21,0.74)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [44, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: serif, fontSize: 86, color: accent ? COLORS.alert : COLORS.cream }}>{value}</span>
        <span style={{ fontFamily: sans, fontSize: 30, color: COLORS.muted }}>{unit}</span>
      </div>
      <div style={{ fontFamily: sans, fontSize: 23, color: COLORS.muted, marginTop: 12, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
};

export const Custo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const punch = spring({ frame: frame - 200, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Photo src="images/scene_family.jpg" focus={[0.62, 0.4]} zoomFrom={1.12} zoomTo={1.02} darken={0.74} />

      <AbsoluteFill style={{ padding: "0 110px", justifyContent: "center", paddingBottom: 150 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: 6, color: COLORS.green, opacity: k }}>
          — O QUE A BUROCRACIA CUSTA
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 78,
            color: COLORS.cream,
            marginTop: 24,
            opacity: k,
            transform: `translateY(${interpolate(k, [0, 1], [22, 0])}px)`,
            maxWidth: 1420,
          }}
        >
          Não é só tempo. É desgaste, é jantar frio,
          <br />
          <span style={{ color: COLORS.green }}>é atenção que sai do paciente.</span>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 56 }}>
          <Cost value="2h" unit="/dia" note="de digitação depois do último atendimento" delay={54} />
          <Cost value="40h" unit="/mês" note="o equivalente a um plantão inteiro de 40 horas" delay={74} accent />
          <Cost value="1" unit="vida" note="a sua — a que fica esperando você chegar" delay={94} />
        </div>

        <div
          style={{
            marginTop: 44,
            fontFamily: sans,
            fontSize: 30,
            color: COLORS.cream,
            opacity: punch,
            transform: `translateY(${interpolate(punch, [0, 1], [16, 0])}px)`,
          }}
        >
          E o pior: quanto mais você digita, menos você olha para quem está na sua frente.
        </div>
      </AbsoluteFill>

      <Caption
        text="“São até quarenta horas por mês. Um plantão inteiro, gasto em burocracia — longe do paciente e longe de casa.”"
        delay={20}
        align="center"
      />
    </AbsoluteFill>
  );
};
