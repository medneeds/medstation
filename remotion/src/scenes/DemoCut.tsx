import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";
import { ProductFrame } from "../components/ProductFrame";

type Props = {
  index: string;
  kicker: string;
  title: string;
  italic?: string;
  bullets: string[];
  caption: string;
  src: string;
  label: string;
  focus?: [number, number];
  side?: "left" | "right";
};

export const DemoCut: React.FC<Props> = ({
  index,
  kicker,
  title,
  italic,
  bullets,
  caption,
  src,
  label,
  focus = [0.5, 0.4],
  side = "right",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  const textCol = (
    <div style={{ width: 470 }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5, color: COLORS.green, opacity: 0.9 }}>
        {index} · {kicker}
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 66,
          lineHeight: 1.06,
          color: COLORS.cream,
          marginTop: 22,
          opacity: t,
          transform: `translateY(${interpolate(t, [0, 1], [24, 0])}px)`,
        }}
      >
        {title}
        {italic ? (
          <>
            <br />
            <span style={{ fontStyle: "italic", color: COLORS.green }}>{italic}</span>
          </>
        ) : null}
      </div>
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 18 }}>
        {bullets.map((b, i) => {
          const s = spring({ frame: frame - 34 - i * 12, fps, config: { damping: 200 } });
          return (
            <div
              key={b}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "baseline",
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-18, 0])}px)`,
              }}
            >
              <span style={{ color: COLORS.green, fontSize: 18, lineHeight: 1.6 }}>•</span>
              <span style={{ fontFamily: sans, fontSize: 26, lineHeight: 1.45, color: COLORS.muted }}>{b}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

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
          flexDirection: side === "right" ? "row" : "row-reverse",
        }}
      >
        {textCol}
        <ProductFrame src={src} label={label} focus={focus} width={1130} height={636} />
      </div>
      <Caption text={caption} delay={10} align="center" />
    </AbsoluteFill>
  );
};
