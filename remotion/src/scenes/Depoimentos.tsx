import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../theme";
import { serif, serifItalic, sans, mono } from "../fonts";
import { QuoteCard } from "../components/QuoteCard";
import { Caption } from "../components/Caption";

export const Depoimentos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const second = frame > 250;
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: out, padding: "0 96px", justifyContent: "center", paddingBottom: 140 }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: 5.5, color: COLORS.green, opacity: k }}>
        QUEM JÁ USA
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 64,
          color: COLORS.cream,
          marginTop: 18,
          opacity: k,
          transform: `translateY(${interpolate(k, [0, 1], [20, 0])}px)`,
        }}
      >
        Médicos que saíram mais cedo —{" "}
        <span style={{ fontFamily: serifItalic, color: COLORS.green }}>sem atender menos.</span>
      </div>

      <div style={{ display: "flex", gap: 22, marginTop: 48, height: 430 }}>
        {second ? (
          <>
            <QuoteCard
              key="c"
              quote="No plantão eu gravo a avaliação à beira do leito. Chego no computador e a evolução já está estruturada."
              name="Dr. R. A."
              meta="EMERGENCISTA · RECIFE"
              delay={260}
              featured
            />
            <QuoteCard
              key="d"
              quote="Meu prontuário ficou melhor escrito do que quando eu digitava correndo às 22h."
              name="Dra. C. M."
              meta="CLÍNICA MÉDICA · BELO HORIZONTE"
              delay={280}
            />
            <QuoteCard
              key="e"
              quote="Paguei a assinatura do ano com o tempo que economizei na primeira semana."
              name="Dr. L. F."
              meta="CARDIOLOGIA · PORTO ALEGRE"
              delay={300}
            />
          </>
        ) : (
          <>
            <QuoteCard
              key="a"
              quote="Eu voltei a olhar para o paciente durante a consulta. Só isso já valeria."
              name="Dra. A. P."
              meta="CLÍNICA MÉDICA · SÃO PAULO"
              delay={40}
            />
            <QuoteCard
              key="b"
              quote="Saio do consultório com tudo pronto. Nunca mais levei prontuário para casa."
              name="Dr. M. S."
              meta="PEDIATRIA · CURITIBA"
              delay={60}
              featured
            />
            <QuoteCard
              key="f"
              quote="Em 30 segundos falando eu tenho a anamnese que levava oito minutos digitando."
              name="Dra. J. T."
              meta="MEDICINA DE FAMÍLIA · SALVADOR"
              delay={80}
            />
          </>
        )}
      </div>

      <Caption
        text="“Não é promessa. É o que médicos já estão vivendo todo dia — no consultório e no plantão.”"
        delay={18}
        align="center"
      />
    </AbsoluteFill>
  );
};
