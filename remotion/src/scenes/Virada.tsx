import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

export const Virada: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const line = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const brand = spring({ frame: frame - 54, fps, config: { damping: 20, stiffness: 110 } });
  const tag = spring({ frame: frame - 104, fps, config: { damping: 200 } });
  const sweep = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 58% at 50% 46%, rgba(143,227,181,${0.16 * brand}) 0%, rgba(8,11,9,0) 62%)`,
        }}
      />
      <div style={{ textAlign: "center", paddingBottom: 120 }}>
        <div
          style={{
            fontFamily: sans,
            fontSize: 40,
            color: COLORS.muted,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [20, 0])}px)`,
          }}
        >
          Existe outro jeito de fazer isso.
        </div>

        <div
          style={{
            width: interpolate(sweep, [0, 1], [0, 560]),
            height: 1,
            background: COLORS.green,
            opacity: 0.55,
            margin: "38px auto",
          }}
        />

        <div
          style={{
            fontFamily: serif,
            fontSize: 132,
            color: COLORS.cream,
            letterSpacing: -1,
            opacity: brand,
            transform: `scale(${interpolate(brand, [0, 1], [0.94, 1])})`,
          }}
        >
          MedStation <span style={{ color: COLORS.green }}>AI</span>
        </div>

        <div
          style={{
            fontFamily: serifItalic,
            fontSize: 62,
            color: COLORS.green,
            marginTop: 18,
            opacity: tag,
            transform: `translateY(${interpolate(tag, [0, 1], [18, 0])}px)`,
          }}
        >
          Produza mais. Digite menos.
        </div>

        <div
          style={{
            fontFamily: mono,
            fontSize: 18,
            letterSpacing: 6,
            color: COLORS.muted,
            marginTop: 34,
            opacity: tag * 0.9,
          }}
        >
          CONSULTÓRIO · PLANTÃO · BEIRA-LEITO
        </div>
      </div>

      <Caption
        text="“A MedStation AI nasceu para devolver esse tempo — no consultório, no plantão e à beira do leito.”"
        delay={16}
        align="center"
      />
    </AbsoluteFill>
  );
};
