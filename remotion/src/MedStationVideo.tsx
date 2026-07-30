import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Atmosphere } from "./components/Atmosphere";
import { T } from "./theme";
import { Hook } from "./scenes/Hook";
import { Virada } from "./scenes/Virada";
import { DemoCut } from "./scenes/DemoCut";
import { Prova } from "./scenes/Prova";
import { Gratis } from "./scenes/Gratis";
import { Preco } from "./scenes/Preco";
import { Fecho } from "./scenes/Fecho";

export const MedStationVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Atmosphere />

      <Sequence from={T.hook.from} durationInFrames={T.hook.dur}>
        <Hook />
      </Sequence>

      <Sequence from={T.virada.from} durationInFrames={T.virada.dur}>
        <Virada />
      </Sequence>

      <Sequence from={T.cut1.from} durationInFrames={T.cut1.dur}>
        <DemoCut
          index="01"
          kicker="EXAMINUS"
          title="Cole o exame."
          italic="Receba o que importa."
          bullets={["Laboratório, laudo ou foto", "Resposta organizada em segundos", "Grátis para todo médico cadastrado"]}
          caption="“Cole um exame, um laudo, uma foto. Em segundos você tem o que importa, organizado.”"
          src="images/examinus_resposta.png"
          label="Examinus · Interpretação de exames"
          focus={[0.55, 0.42]}
        />
      </Sequence>

      <Sequence from={T.cut2.from} durationInFrames={T.cut2.dur}>
        <DemoCut
          index="02"
          kicker="ASSISTENTES"
          title="Dez assistentes,"
          italic="um para cada rotina."
          bullets={["Evolução, prescrição e gasometria", "Protocolos, atestado e orientação", "Sempre no seu tom, no seu formato"]}
          caption="“São dez assistentes: evolução, prescrição, gasometria, protocolos, atestado, orientação ao paciente.”"
          src="images/clinicus.png"
          label="Assistentes clínicos"
          focus={[0.45, 0.4]}
          side="left"
        />
      </Sequence>

      <Sequence from={T.cut3.from} durationInFrames={T.cut3.dur}>
        <DemoCut
          index="03"
          kicker="MODO CONSULTÓRIO"
          title="Você só conversa"
          italic="com o paciente."
          bullets={["A consulta vira anamnese estruturada", "Tudo pronto para copiar e colar", "Zero digitação durante o atendimento"]}
          caption="“No Modo Consultório, você só conversa com o paciente. A consulta vira anamnese pronta para copiar.”"
          src="images/consultorio.png"
          label="Modo Consultório"
          focus={[0.5, 0.42]}
        />
      </Sequence>

      <Sequence from={T.prova.from} durationInFrames={T.prova.dur}>
        <Prova />
      </Sequence>

      <Sequence from={T.gratis.from} durationInFrames={T.gratis.dur}>
        <Gratis />
      </Sequence>

      <Sequence from={T.preco.from} durationInFrames={T.preco.dur}>
        <Preco />
      </Sequence>

      <Sequence from={T.fecho.from} durationInFrames={T.fecho.dur}>
        <Fecho />
      </Sequence>
    </AbsoluteFill>
  );
};
