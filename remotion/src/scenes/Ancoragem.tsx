import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { Caption } from "../components/Caption";

/** Price ladder: each anchor appears, then gets struck through. */
const Rung: React.FC<{ value: string; delay: number; strikeAt: number; final?: boolean }> = ({
  value,
  delay,
  strikeAt,
  final,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 140 } });
  const strike = interpolate(frame, [strikeAt, strikeAt + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dim = final ? 1 : interpolate(strike, [0, 1], [1, 0.34]);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        opacity: s * dim,
        transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
        marginRight: 46,
      }}
    >
      <span
        style={{
          fontFamily: serif,
          fontSize: final ? 104 : 88,
          color: final ? COLORS.green : COLORS.cream,
          letterSpacing: -1,
        }}
      >
        {value}
      </span>
      {final ? null : (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "56%",
            height: 4,
            width: `${strike * 100}%`,
            background: COLORS.alert,
            borderRadius: 4,
          }}
        />
      )}
    </div>
  );
};

export const Ancoragem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const math = spring({ frame: frame - 40, fps, config: { damping: 200 } });
  const ask = spring({ frame: frame - 150, fps, config: { damping: 200 } });
  const kicker2 = spring({ frame: frame - 430, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, padding: "0 110px", justifyContent: "center", paddingBottom: 150 }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.green, opacity: k }}>
        QUANTO ISSO VALE
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 34,
          marginTop: 28,
          opacity: math,
          transform: `translateY(${interpolate(math, [0, 1], [22, 0])}px)`,
        }}
      >
        <div>
          <div style={{ fontFamily: serif, fontSize: 62, color: COLORS.cream }}>12h de plantão</div>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 3, color: COLORS.muted, marginTop: 8 }}>
            ≈ R$ 1.000
          </div>
        </div>
        <div style={{ fontFamily: serif, fontSize: 54, color: COLORS.green }}>→</div>
        <div>
          <div style={{ fontFamily: serif, fontSize: 62, color: COLORS.cream }}>40h de plantão</div>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 3, color: COLORS.muted, marginTop: 8 }}>
            ≈ R$ 4.000 A R$ 5.000
          </div>
        </div>
        <div style={{ fontFamily: serif, fontSize: 54, color: COLORS.green }}>=</div>
        <div>
          <div style={{ fontFamily: serifItalic, fontSize: 62, color: COLORS.green }}>o que a MedStation</div>
          <div style={{ fontFamily: serifItalic, fontSize: 62, color: COLORS.green }}>te devolve por mês</div>
        </div>
      </div>

      <div
        style={{
          fontFamily: sans,
          fontSize: 34,
          color: COLORS.muted,
          marginTop: 46,
          opacity: ask,
          transform: `translateY(${interpolate(ask, [0, 1], [16, 0])}px)`,
        }}
      >
        Então, quanto custa?
      </div>

      <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
        <Rung value="R$ 5.000" delay={185} strikeAt={215} />
        <Rung value="R$ 4.000" delay={240} strikeAt={270} />
        <Rung value="R$ 1.000" delay={295} strikeAt={325} />
        <Rung value="R$ 500" delay={350} strikeAt={380} />
      </div>

      <div
        style={{
          marginTop: 40,
          fontFamily: serif,
          fontSize: 58,
          color: COLORS.cream,
          opacity: kicker2,
          transform: `translateY(${interpolate(kicker2, [0, 1], [20, 0])}px)`,
        }}
      >
        Não custa nada disso.{" "}
        <span style={{ fontFamily: serifItalic, color: COLORS.green }}>Custa menos que um jantar.</span>
      </div>

      <Caption
        text="“Não vai custar cinco mil. Nem quatro mil. Não custa nem mil reais. Nem quinhentos.”"
        delay={190}
        out={durationInFrames - 20}
        align="center"
      />
    </AbsoluteFill>
  );
};
