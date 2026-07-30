import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, mono, sans } from "../fonts";
import { Photo } from "../components/Photo";
import { ProductFrame } from "../components/ProductFrame";
import { Caption } from "../components/Caption";
import { Bullet } from "../components/Kicker";

export const Demo: React.FC<{
  index: string;
  kicker: string;
  title: string;
  italic: string;
  bullets: string[];
  caption: string;
  plate: string;
  plateFocus?: [number, number];
  shot: string;
  shotLabel: string;
  shotFocus?: [number, number];
  side?: "left" | "right";
}> = ({
  index,
  kicker,
  title,
  italic,
  bullets,
  caption,
  plate,
  plateFocus = [0.5, 0.45],
  shot,
  shotLabel,
  shotFocus = [0.5, 0.4],
  side = "right",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  const textCol = (
    <div style={{ width: 620, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, opacity: k }}>
        <span style={{ fontFamily: serif, fontSize: 40, color: COLORS.green, opacity: 0.5 }}>{index}</span>
        <span style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.green }}>{kicker}</span>
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 64,
          lineHeight: 1.06,
          color: COLORS.cream,
          marginTop: 20,
          opacity: k,
          transform: `translateY(${interpolate(k, [0, 1], [24, 0])}px)`,
        }}
      >
        {title}
        <br />
        <span style={{ fontFamily: serifItalic, color: COLORS.green }}>{italic}</span>
      </div>
      <div style={{ height: 1, background: COLORS.line, margin: "34px 0 30px", opacity: k }} />
      <div>
        {bullets.map((b, i) => (
          <Bullet key={b} text={b} index={i} delay={44 + i * 16} />
        ))}
      </div>
    </div>
  );

  const shotCol = (
    <div style={{ flex: 1, display: "flex", justifyContent: side === "right" ? "flex-end" : "flex-start" }}>
      <ProductFrame src={shot} label={shotLabel} focus={shotFocus} width={1060} height={606} delay={18} />
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Photo src={plate} focus={plateFocus} zoomFrom={1.1} zoomTo={1.02} darken={0.82} fadeIn={14} />
      <AbsoluteFill
        style={{
          flexDirection: side === "right" ? "row" : "row-reverse",
          alignItems: "center",
          gap: 60,
          padding: "0 96px",
          paddingBottom: 140,
        }}
      >
        {textCol}
        {shotCol}
      </AbsoluteFill>
      <Caption text={caption} delay={18} />
    </AbsoluteFill>
  );
};
