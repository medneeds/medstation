import type { AssistantSlide } from "@/components/AssistantShowcaseDialog";

export const assistantSlides: Record<string, AssistantSlide[]> = {
  Examinus: [
    {
      eyebrow: "O problema",
      title: "Exames vêm em formatos caóticos",
      body: "Laudos colados de PDFs, prints de tela, listas longas em ordem aleatória — tudo isso atrasa a evolução e dificulta a leitura à beira do leito.",
    },
    {
      eyebrow: "Como funciona",
      title: "Cole, envie ou fotografe",
      body: "Examinus aceita texto, imagem e PDF. Em segundos, ele extrai, organiza por categoria clínica e prioriza alterações relevantes.",
      bullets: [
        "OCR de imagens e PDFs digitalizados",
        "14 categorias clínicas hierarquizadas",
        "Toggles de saída: pipe, tempo, compacto, impressão",
      ],
    },
    {
      eyebrow: "Exemplo",
      title: "Saída pronta para evolução",
      body: "Formatação consistente, separadores claros e ordem clínica útil — pronta para colar no prontuário.",
      example: {
        label: "Saída Examinus",
        lines: [
          "HEMOGRAMA | Hb 9.2 ↓ | Leuco 14.300 ↑ | Plaq 180.000",
          "FUNÇÃO RENAL | Cr 1.8 ↑ | U 78 ↑ | TFG 38",
          "ELETRÓLITOS | Na 132 | K 5.4 ↑ | Cl 102",
        ],
      },
    },
  ],
  Clínicus: [
    {
      eyebrow: "O problema",
      title: "Anamnese leva tempo demais",
      body: "Estruturar HMA, comorbidades, exame físico e plano em texto contínuo, sem perder coerência clínica, consome minutos preciosos por paciente.",
    },
    {
      eyebrow: "Como funciona",
      title: "Discussão ou Documentação",
      body: "Dois modos: discuta o caso em linguagem natural ou gere a AHE (anamnese hospitalar estruturada) diretamente, em texto corrido pronto para o prontuário.",
      bullets: [
        "Modo Discussão: raciocínio clínico passo a passo",
        "Modo Documentação: AHE pronta para colar",
        "Modo Escuta: transcrição de áudio com anti-alucinação",
      ],
    },
    {
      eyebrow: "Exemplo",
      title: "Texto contínuo, estrutura rigorosa",
      body: "Saída padronizada, sem markdown, sem asteriscos — apenas o que entra no prontuário.",
      example: {
        label: "AHE Clínicus",
        lines: [
          "IDENTIFICAÇÃO",
          "Paciente masculino, 62 anos, hipertenso e diabético...",
          "",
          "HMA",
          "Refere dor torácica retroesternal há 3h, em aperto...",
        ],
      },
    },
  ],
  Scorius: [
    {
      eyebrow: "O problema",
      title: "Scores médicos são dispersos",
      body: "CHA₂DS₂-VASc, qSOFA, Wells, GRACE — cada um em uma calculadora, com critérios fáceis de errar sob pressão.",
    },
    {
      eyebrow: "Como funciona",
      title: "Pergunte, calcule, interprete",
      body: "Diga o cenário em linguagem natural. Scorius identifica o score correto, calcula e devolve interpretação com conduta sugerida.",
      bullets: [
        "Mais de 100 escalas prognósticas",
        "Interpretação clínica com risco e conduta",
        "Sugere o score certo para o contexto",
      ],
    },
  ],
  Numerus: [
    {
      eyebrow: "O problema",
      title: "Cálculos de cabeça erram",
      body: "Conversão de drogas vasoativas, gotejamento, clearance, superfície corporal — todos críticos, todos sujeitos a erro humano.",
    },
    {
      eyebrow: "Como funciona",
      title: "Calculadora conversacional",
      body: "Peça em linguagem natural, receba o cálculo com unidades, fórmula e referência. Sem aplicativos isolados.",
      bullets: [
        "Drogas vasoativas e bombas de infusão",
        "Conversão de unidades clínicas",
        "Clearance, BSA, IMC e mais",
      ],
    },
  ],
  Prescriptus: [
    {
      eyebrow: "O problema",
      title: "Prescrever exige lembrar muito",
      body: "Doses, ajustes para função renal, interações, vias e diluições — uma omissão pode mudar o desfecho.",
    },
    {
      eyebrow: "Como funciona",
      title: "Prescrição + Bula Inteligente",
      body: "Discuta o caso ou peça uma prescrição direta. A B.I. integrada traz dose, ajuste, interação e contraindicação na hora.",
      bullets: [
        "Modo Discussão para raciocínio terapêutico",
        "Modo Bula Inteligente (B.I.) para consulta rápida",
        "Ajustes por função renal e hepática",
      ],
    },
  ],
  CODexus: [
    {
      eyebrow: "O problema",
      title: "CID-10 e TISS travam o fluxo",
      body: "Procurar códigos manualmente em tabelas extensas atrasa altas, faturamento e auditoria.",
    },
    {
      eyebrow: "Como funciona",
      title: "Diagnóstico → código em segundos",
      body: "Descreva o quadro em texto livre. CODexus retorna CID-10, código TISS e procedimentos relacionados.",
      bullets: [
        "Busca semântica em CID-10",
        "Códigos TISS para faturamento",
        "Procedimentos médicos correlatos",
      ],
    },
  ],
  Gasometrus: [
    {
      eyebrow: "O problema",
      title: "Gasometria sob pressão",
      body: "Interpretar pH, PaCO₂, HCO₃, BE, ânion gap e compensação esperada — em segundos, à beira do leito.",
    },
    {
      eyebrow: "Como funciona",
      title: "Leitura sistemática completa",
      body: "Cole os valores. Gasometrus devolve análise em 7 seções obrigatórias, no tom de plantonista experiente.",
      bullets: [
        "7 seções: distúrbio, compensação, gap, oxigenação...",
        "Modo L.I. (Leitura Inteligente) para análise abreviada",
        "Conduta sugerida com base no quadro",
      ],
    },
  ],
  Atestus: [
    {
      eyebrow: "O problema",
      title: "Atestado é repetitivo",
      body: "Reescrever o mesmo modelo, lembrar do CID, ajustar período — várias vezes por turno.",
    },
    {
      eyebrow: "Como funciona",
      title: "Atestado pronto, com CID",
      body: "Diga motivo e período. Atestus gera o documento com CID — sem descrição da doença, respeitando o sigilo.",
      bullets: [
        "Atestados, declarações e comparecimento",
        "Apenas CID, nunca descrição da doença",
        "Pronto para imprimir ou copiar",
      ],
    },
  ],
  Protocolus: [
    {
      eyebrow: "O problema",
      title: "Guidelines mudam toda hora",
      body: "AHA, ESC, OMS, SBC — manter-se atualizado em todas as áreas é impossível na correria do plantão.",
    },
    {
      eyebrow: "Como funciona",
      title: "Consulta global em segundos",
      body: "Pergunte sobre qualquer protocolo. Protocolus traz a recomendação atual, com classe e nível de evidência.",
      bullets: [
        "Diretrizes nacionais e internacionais",
        "AHA, ESC, OMS, SBC e mais",
        "Resposta com classe de recomendação",
      ],
    },
  ],
  Orientus: [
    {
      eyebrow: "O problema",
      title: "Orientação de alta é fundamental",
      body: "Paciente que não entende a alta volta. Mas escrever orientações claras, em linguagem leiga, leva tempo.",
    },
    {
      eyebrow: "Como funciona",
      title: "Linguagem do paciente",
      body: "Diga o diagnóstico e o plano. Orientus gera instruções claras, no tom certo para o paciente entender e seguir.",
      bullets: [
        "Linguagem leiga, sem jargão médico",
        "Sinais de alarme destacados",
        "Pronto para imprimir e entregar",
      ],
    },
  ],
  Mediscuss: [
    {
      eyebrow: "O problema",
      title: "Pedir parecer consome tempo",
      body: "Reunir história, evolução, exames e conduta em um texto claro para o especialista, a regulação ou a UTI trava o plantão e atrasa a comunicação entre equipes.",
    },
    {
      eyebrow: "Como funciona",
      title: "Do caso bruto ao texto pronto",
      body: "Cole os dados do paciente, mesmo desorganizados. Mediscuss monta o pedido técnico, cronológico e objetivo, pronto para o prontuário ou sistema.",
      bullets: [
        "Parecer, discussão, internação, UTI e transferência",
        "Ênfases por especialidade (cardio, neuro, cirurgia...)",
        "Nunca inventa dados: sinaliza o que não foi informado",
      ],
    },
    {
      eyebrow: "Exemplo",
      title: "Solicitação pronta para colar",
      body: "Prosa médica hospitalar, sem floreios, com a pergunta clínica no centro.",
      example: {
        label: "Saída Mediscuss",
        lines: [
          "SOLICITAÇÃO DE PARECER — CARDIOLOGIA",
          "",
          "Paciente masculino, 68 anos, hipertenso e diabético,",
          "admitido por dor torácica retroesternal há 4h...",
          "",
          "Solicito avaliação e conduta. Desde já, grato.",
        ],
      },
    },
  ],
};
