import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";

export const Kicker: React.FC<{ text: string; delay?: number; color?: string }> = ({
  text,
  delay = 4,
  color = COLORS.green,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 17,
        letterSpacing: 6,
        color,
        opacity: s * 0.95,
        transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

export const Title: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  maxWidth?: number;
}> = ({ children, delay = 12, size = 86, maxWidth = 1240 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.9 } });
  return (
    <div
      style={{
        fontFamily: serif,
        fontSize: size,
        lineHeight: 1.05,
        color: COLORS.cream,
        marginTop: 26,
        maxWidth,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Em: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: serifItalic, color: COLORS.green }}>{children}</span>
);

export const Bullet: React.FC<{ text: string; delay: number; index: number }> = ({ text, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        opacity: s,
        transform: `translateX(${interpolate(s, [0, 1], [-26, 0])}px)`,
        marginTop: index === 0 ? 0 : 20,
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 15, color: COLORS.green, letterSpacing: 2 }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <span style={{ fontFamily: sans, fontSize: 30, color: COLORS.cream, letterSpacing: -0.2 }}>{text}</span>
    </div>
  );
};
