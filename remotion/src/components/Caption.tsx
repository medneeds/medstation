import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { sans } from "../fonts";

/** Narration line, rendered as a restrained lower-third caption. */
export const Caption: React.FC<{
  text: string;
  delay?: number;
  out?: number;
  align?: "left" | "center";
}> = ({ text, delay = 12, out, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const outAt = out ?? durationInFrames - 18;

  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [outAt, outAt + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = s * fadeOut;

  return (
    <div
      style={{
        position: "absolute",
        left: align === "center" ? 0 : 120,
        right: align === "center" ? 0 : 120,
        bottom: 78,
        display: "flex",
        justifyContent: align === "center" ? "center" : "flex-start",
        opacity,
        transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "16px 26px 16px 22px",
          borderRadius: 6,
          background: "rgba(8,11,9,0.72)",
          border: `1px solid ${COLORS.line}`,
          maxWidth: 1320,
        }}
      >
        <div style={{ width: 3, alignSelf: "stretch", background: COLORS.green, opacity: 0.85 }} />
        <span
          style={{
            fontFamily: sans,
            fontSize: 30,
            lineHeight: 1.34,
            color: COLORS.cream,
            letterSpacing: -0.2,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
