import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, sans, mono } from "../fonts";
import { Photo } from "../components/Photo";
import { Caption } from "../components/Caption";

export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const t2 = spring({ frame: frame - 62, fps, config: { damping: 200 } });
  const t3 = spring({ frame: frame - 118, fps, config: { damping: 200 } });
  const caret = frame % 26 < 14 ? 1 : 0.08;
  const clock = 22 * 60 + 41 + Math.floor(frame / 60);
  const hh = String(Math.floor(clock / 60)).padStart(2, "0");
  const mm = String(clock % 60).padStart(2, "0");
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Photo src="images/scene_typing.jpg" focus={[0.42, 0.45]} zoomFrom={1.05} zoomTo={1.15} darken={0.5} />

      <div
        style={{
          position: "absolute",
          top: 72,
          right: 110,
          fontFamily: mono,
          fontSize: 22,
          letterSpacing: 5,
          color: COLORS.cream,
          opacity: 0.72,
        }}
      >
        {hh}:{mm}
      </div>

      <div style={{ position: "absolute", left: 110, bottom: 250, width: 1180 }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 96,
            lineHeight: 1.04,
            color: COLORS.cream,
            opacity: t,
            transform: `translateY(${interpolate(t, [0, 1], [34, 0])}px)`,
          }}
        >
          O último paciente foi embora às sete.
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 96,
            lineHeight: 1.04,
            color: COLORS.green,
            marginTop: 12,
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [28, 0])}px)`,
          }}
        >
          Você ainda está aqui.
          <span style={{ opacity: caret }}>|</span>
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 34,
            color: COLORS.muted,
            marginTop: 34,
            opacity: t3,
            transform: `translateY(${interpolate(t3, [0, 1], [18, 0])}px)`,
          }}
        >
          Digitando o que você já sabe de cabeça.
        </div>
      </div>

      <Caption text="“O último paciente foi embora às sete da noite. E você ainda está aqui — digitando.”" delay={22} />
    </AbsoluteFill>
  );
};
