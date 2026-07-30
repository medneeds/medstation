import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serifItalic, sans, mono } from "../fonts";

export const QuoteCard: React.FC<{
  quote: string;
  name: string;
  meta: string;
  delay: number;
  featured?: boolean;
}> = ({ quote, name, meta, delay, featured }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 120 } });
  const float = Math.sin((frame - delay) / 46) * 4;

  return (
    <div
      style={{
        flex: 1,
        padding: "38px 34px 32px",
        borderRadius: 14,
        border: `1px solid ${featured ? "rgba(143,227,181,0.4)" : COLORS.line}`,
        background: featured ? "rgba(143,227,181,0.07)" : "rgba(17,24,21,0.78)",
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [46, 0]) + float}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontFamily: serifItalic, fontSize: 34, color: COLORS.green, lineHeight: 1, marginBottom: 12 }}>
          &ldquo;
        </div>
        <div style={{ fontFamily: sans, fontSize: 26, lineHeight: 1.42, color: COLORS.cream }}>{quote}</div>
      </div>
      <div style={{ marginTop: 30 }}>
        <div style={{ height: 1, background: COLORS.line, marginBottom: 16 }} />
        <div style={{ fontFamily: sans, fontSize: 22, color: COLORS.cream }}>{name}</div>
        <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: 2.2, color: COLORS.muted, marginTop: 7 }}>
          {meta}
        </div>
      </div>
    </div>
  );
};
