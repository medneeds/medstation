import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Atmosphere } from "./components/Atmosphere";
import { T } from "./theme";
import { Abertura } from "./scenes/Abertura";
import { Dor } from "./scenes/Dor";
import { Custo } from "./scenes/Custo";
import { Virada } from "./scenes/Virada";
import { Demo } from "./scenes/Demo";
import { Depoimentos } from "./scenes/Depoimentos";
import { Ancoragem } from "./scenes/Ancoragem";
import { Planos } from "./scenes/Planos";
import { Garantia } from "./scenes/Garantia";
import { Fecho } from "./scenes/Fecho";

export const MedStationVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Atmosphere />

      <Sequence from={T.abertura.from} durationInFrames={T.abertura.dur}>
        <Abertura />
      </Sequence>

      <Sequence from={T.dor.from} durationInFrames={T.dor.dur}>
        <Dor />
      </Sequence>

      <Sequence from={T.custo.from} durationInFrames={T.custo.dur}>
        <Custo />
      </Sequence>

      <Sequence from={T.virada.from} durationInFrames={T.virada.dur}>
        <Virada />
      </Sequence>

      <Sequence from={T.plantao.from} durationInFrames={T.plantao.dur}>
        <Demo
          index="01"
          kicker="PLANTÃO · BEIRA-LEITO"
          title="Avalie o paciente."
          italic="A evolução já sai pronta."
          bullets={[
            "Grave a avaliação com a permissão do paciente",
            "Ou narre o caso no caminho até o computador",
            "Exame físico e sinais vitais já estruturados",
          ]}
          caption="“No plantão, você grava a avaliação à beira do leito — ou narra o caso no caminho. A estruturação te espera pronta.”"
          plate="images/scene_bedside.jpg"
          plateFocus={[0.3, 0.4]}
          shot="images/consultorio.png"
          shotLabel="Modo Consultório · beira-leito"
          shotFocus={[0.5, 0.42]}
        />
      </Sequence>

      <Sequence from={T.consultorio.from} durationInFrames={T.consultorio.dur}>
        <Demo
          index="02"
          kicker="MODO CONSULTÓRIO"
          title="Você só conversa"
          italic="com o paciente."
          bullets={[
            "A consulta vira anamnese estruturada",
            "Tudo pronto para copiar e colar no prontuário",
            "Zero digitação durante o atendimento",
          ]}
          caption="“No consultório, você só conversa. A consulta vira anamnese estruturada, pronta para copiar.”"
          plate="images/scene_typing.jpg"
          plateFocus={[0.6, 0.45]}
          shot="images/consultorio.png"
          shotLabel="Modo Consultório · tempo real"
          shotFocus={[0.5, 0.5]}
          side="left"
        />
      </Sequence>

      <Sequence from={T.assistentes.from} durationInFrames={T.assistentes.dur}>
        <Demo
          index="03"
          kicker="DEZ ASSISTENTES CLÍNICOS"
          title="Um assistente"
          italic="para cada rotina sua."
          bullets={[
            "Evolução, prescrição e gasometria",
            "Protocolos, atestado e orientação ao paciente",
            "Sempre no seu tom e no seu formato",
          ]}
          caption="“São dez assistentes: evolução, prescrição, gasometria, protocolos, atestado, orientação ao paciente.”"
          plate="images/scene_emergency.jpg"
          plateFocus={[0.6, 0.4]}
          shot="images/clinicus.png"
          shotLabel="Assistentes clínicos"
          shotFocus={[0.45, 0.4]}
        />
      </Sequence>

      <Sequence from={T.examinus.from} durationInFrames={T.examinus.dur}>
        <Demo
          index="04"
          kicker="EXAMINUS · GRÁTIS"
          title="Cole o exame."
          italic="Receba o que importa."
          bullets={[
            "Laboratório, laudo ou foto do papel",
            "Resposta organizada em segundos",
            "Grátis para todo médico cadastrado",
          ]}
          caption="“E o Examinus é grátis: cole um exame, um laudo, uma foto — em segundos você tem o que importa.”"
          plate="images/scene_bedside.jpg"
          plateFocus={[0.7, 0.42]}
          shot="images/examinus_resposta.png"
          shotLabel="Examinus · interpretação de exames"
          shotFocus={[0.55, 0.42]}
          side="left"
        />
      </Sequence>

      <Sequence from={T.depoimentos.from} durationInFrames={T.depoimentos.dur}>
        <Depoimentos />
      </Sequence>

      <Sequence from={T.ancoragem.from} durationInFrames={T.ancoragem.dur}>
        <Ancoragem />
      </Sequence>

      <Sequence from={T.planos.from} durationInFrames={T.planos.dur}>
        <Planos />
      </Sequence>

      <Sequence from={T.garantia.from} durationInFrames={T.garantia.dur}>
        <Garantia />
      </Sequence>

      <Sequence from={T.fecho.from} durationInFrames={T.fecho.dur}>
        <Fecho />
      </Sequence>
    </AbsoluteFill>
  );
};
