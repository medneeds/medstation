import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";

/**
 * Animated MedStation monogram (two mountain peaks forming an "M").
 * Strokes trace in, peaks rise, mint fill blooms, subtle float + glow pulse.
 */
export const LogoMarkAnim: React.FC<{ size?: number; delay?: number }> = ({
  size = 520,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;

  const frameIn = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 26 });
  const backIn = spring({ frame: f - 12, fps, config: { damping: 18, stiffness: 120 } });
  const frontIn = spring({ frame: f - 20, fps, config: { damping: 16, stiffness: 140 } });

  const dashBack = interpolate(backIn, [0, 1], [40, 0]);
  const dashFront = interpolate(frontIn, [0, 1], [48, 0]);

  const float = Math.sin(f / 22) * 8;
  const breathe = 1 + Math.sin(f / 26) * 0.012;
  const glow = interpolate(Math.sin(f / 18), [-1, 1], [0.28, 0.6]);

  const fillBack = interpolate(f, [30, 52], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        transform: `translateY(${float}px) scale(${breathe})`,
        filter: `drop-shadow(0 0 ${60 * glow}px rgba(143,227,181,${glow * 0.7}))`,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32">
        <defs>
          <linearGradient id="peakFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(238,244,239,0.16)" />
            <stop offset="100%" stopColor="rgba(238,244,239,0.02)" />
          </linearGradient>
        </defs>

        {/* frame */}
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="3.5"
          fill="rgba(12,18,16,0.55)"
          stroke={COLORS.line}
          strokeWidth="0.75"
          strokeDasharray="124"
          strokeDashoffset={interpolate(frameIn, [0, 1], [124, 0])}
        />

        {/* registration ticks */}
        <g
          stroke={COLORS.muted}
          strokeWidth="0.8"
          fill="none"
          opacity={interpolate(f, [22, 40], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          strokeLinecap="square"
        >
          <path d="M3.5 6.5 L3.5 3.5 L6.5 3.5" />
          <path d="M28.5 25.5 L28.5 28.5 L25.5 28.5" />
        </g>

        {/* back peak — mint */}
        <path
          d="M14 22 L20 11 L26 22 Z"
          fill={`rgba(143,227,181,${fillBack})`}
          stroke={COLORS.green}
          strokeWidth="1.1"
          strokeLinejoin="miter"
          strokeDasharray="40"
          strokeDashoffset={dashBack}
          transform={`translate(0 ${interpolate(backIn, [0, 1], [7, 0])})`}
        />

        {/* front peak */}
        <path
          d="M6 22 L13 8 L20 22 Z"
          fill="url(#peakFront)"
          stroke={COLORS.cream}
          strokeWidth="1.5"
          strokeLinejoin="miter"
          strokeDasharray="48"
          strokeDashoffset={dashFront}
          transform={`translate(0 ${interpolate(frontIn, [0, 1], [9, 0])})`}
        />

        {/* scan line sweeping the mark */}
        <rect
          x="0.5"
          y={interpolate((f % 90) / 90, [0, 1], [1, 31])}
          width="31"
          height="0.35"
          fill={COLORS.green}
          opacity={0.35}
        />
      </svg>
    </div>
  );
};
