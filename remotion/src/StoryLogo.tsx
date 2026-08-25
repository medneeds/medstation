import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  random,
} from "remotion";
import { COLORS } from "./theme";
import { serif, sans, mono } from "./fonts";
import { LogoMarkAnim } from "./components/LogoMarkAnim";

/* ── background: dark clinical depth with motion ─────────────────── */
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const driftA = Math.sin(frame / 48) * 60;
  const driftB = Math.cos(frame / 62) * 80;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 45% at ${50 + driftA / 14}% ${34 + driftB / 40}%, rgba(62,143,104,0.42) 0%, rgba(8,11,9,0) 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 40% at ${22 - driftB / 20}% ${82 + driftA / 40}%, rgba(143,227,181,0.16) 0%, rgba(8,11,9,0) 60%)`,
        }}
      />

      {/* perspective grid drifting upward */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(143,227,181,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(143,227,181,0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          backgroundPosition: `0px ${-(frame * 2.6) % 120}px`,
          transform: "perspective(900px) rotateX(58deg) scale(2.1) translateY(24%)",
          transformOrigin: "50% 100%",
          opacity: 0.7,
          maskImage: "linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          WebkitMaskImage: "linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* speed streaks */}
      {new Array(26).fill(0).map((_, i) => {
        const seedY = random(`y${i}`);
        const seedX = random(`x${i}`);
        const speed = 5 + random(`s${i}`) * 12;
        const len = 60 + random(`l${i}`) * 320;
        const y = seedY * 1920;
        const x = ((seedX * 1080 + frame * speed) % 1400) - 200;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: y,
              left: x,
              width: len,
              height: 1,
              background: `linear-gradient(90deg, rgba(143,227,181,0) 0%, rgba(143,227,181,${0.05 + random(`o${i}`) * 0.16}) 60%, rgba(143,227,181,0) 100%)`,
            }}
          />
        );
      })}

      {/* ECG trace across the lower third */}
      <svg
        width={1080}
        height={300}
        viewBox="0 0 1080 300"
        style={{ position: "absolute", left: 0, top: 1360, opacity: 0.5 }}
      >
        <path
          d="M0 150 H180 l24 -12 l18 26 l22 -110 l22 150 l20 -54 H520 l24 -12 l18 26 l22 -110 l22 150 l20 -54 H1080"
          fill="none"
          stroke={COLORS.green}
          strokeWidth="2.5"
          strokeDasharray="1600"
          strokeDashoffset={interpolate(frame, [0, 150], [1600, -400])}
        />
      </svg>

      <AbsoluteFill
        style={{
          background: "radial-gradient(110% 80% at 50% 42%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.86) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* ── intercut: internal MedStation environment ───────────────────── */
const Intercut: React.FC<{ src: string; label: string }> = ({ src, label }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [durationInFrames - 4, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });
  const scale = interpolate(frame, [0, durationInFrames], [1.02, 1.09]);

  return (
    <AbsoluteFill
      style={{
        opacity: inOp * outOp,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* blurred bleed of the same shot for depth */}
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(46px) saturate(0.6) brightness(0.42)",
          transform: `scale(${scale * 1.2})`,
        }}
      />
      <AbsoluteFill style={{ background: "rgba(8,11,9,0.55)" }} />

      {/* product card — cropped on the working area, not the chrome */}
      <div
        style={{
          position: "relative",
          width: 940,
          height: 1120,
          marginTop: -140,
          borderRadius: 32,
          overflow: "hidden",
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 70px 180px rgba(0,0,0,0.75), 0 0 120px rgba(143,227,181,0.2)",
          transform: `scale(${scale})`,
          background: COLORS.bgSoft,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1880,
            transform: `translate(-620px, -40px)`,
            filter: "saturate(0.95) contrast(1.04) brightness(1.08)",
          }}
        />
        {/* scan sweep over the card */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${interpolate(frame, [0, durationInFrames], [0, 100])}%`,
            height: 3,
            background:
              "linear-gradient(90deg, rgba(143,227,181,0) 0%, rgba(143,227,181,0.7) 50%, rgba(143,227,181,0) 100%)",
          }}
        />
      </div>


      <div
        style={{
          position: "absolute",
          bottom: 420,
          fontFamily: mono,
          fontSize: 34,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: COLORS.green,
        }}
      >
        {label}
      </div>

      <AbsoluteFill
        style={{
          background: "radial-gradient(120% 85% at 50% 48%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.8) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};


/* ── main ────────────────────────────────────────────────────────── */
export const StoryLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cuts = [
    { from: 52, dur: 11 },
    { from: 84, dur: 10 },
    { from: 108, dur: 9 },
  ];
  const inCut = cuts.some((c) => frame >= c.from && frame < c.from + c.dur);

  const wordIn = spring({ frame: frame - 118, fps, config: { damping: 200 }, durationInFrames: 20 });
  const taglineIn = spring({ frame: frame - 128, fps, config: { damping: 200 }, durationInFrames: 20 });
  const finalOut = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: finalOut }}>
      <Backdrop />

      {/* logo stage — hidden during hard cuts */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: inCut ? 0 : 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -120 }}>
          <LogoMarkAnim size={560} delay={4} />

          <div
            style={{
              marginTop: 64,
              fontFamily: serif,
              fontSize: 96,
              letterSpacing: 2,
              color: COLORS.cream,
              opacity: wordIn,
              transform: `translateY(${interpolate(wordIn, [0, 1], [26, 0])}px)`,
            }}
          >
            MedStation
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: sans,
              fontSize: 40,
              color: COLORS.green,
              opacity: taglineIn,
              transform: `translateY(${interpolate(taglineIn, [0, 1], [18, 0])}px)`,
            }}
          >
            Produza mais. Digite menos.
          </div>
        </div>
      </AbsoluteFill>

      <Sequence from={cuts[0].from} durationInFrames={cuts[0].dur}>
        <Intercut src="images/consultorio.png" label="Modo Escuta" />
      </Sequence>
      <Sequence from={cuts[1].from} durationInFrames={cuts[1].dur}>
        <Intercut src="images/clinicus.png" label="Assistentes clínicos" />
      </Sequence>
      <Sequence from={cuts[2].from} durationInFrames={cuts[2].dur}>
        <Intercut src="images/examinus_resposta.png" label="Exames em segundos" />
      </Sequence>

      {/* film grain / flicker */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(0deg, rgba(143,227,181,0.05) 0%, rgba(8,11,9,0) 60%)",
          mixBlendMode: "screen",
          opacity: 0.6 + Math.sin(frame / 5) * 0.08,
        }}
      />
    </AbsoluteFill>
  );
};
