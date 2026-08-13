export type PracticeStep = {
  /** Rótulo curto do passo (ex.: "Você cola") */
  label: string;
  /** Título da tela */
  title: string;
  /** Tipo visual da tela */
  kind: "input" | "process" | "output";
  /** Linhas exibidas dentro da "tela" simulada */
  lines: string[];
  /** Observação curta abaixo da tela */
  note?: string;
};

/**
 * Demonstrações "Ver na prática" — passo a passo do comportamento de cada assistente.
 * Chave = nome do assistente exibido no card.
 */
export const assistantPractice: Record<string, PracticeStep[]> = {
  Examinus: [
    {
      label: "Você cola",
      title: "Cole o exame como ele veio",
      kind: "input",
      lines: [
        "Hb 9,1 / Ht 28% / Leuco 14.300 (85% seg)",
        "Creatinina 2,1 / Ureia 88 / K 5,4",
        "PCR 142 / Na 133 / Plaquetas 178.000",
      ],
      note: "Texto, PDF ou foto do laudo. Não precisa organizar nada antes.",
    },
    {
      label: "Ele analisa",
      title: "O assistente separa o que muda a conduta",
      kind: "process",
      lines: [
        "Agrupando por sistema...",
        "Marcando alterações relevantes...",
        "Descartando ruído de valores normais...",
      ],
      note: "Os valores normais saem da frente. O que é alterado vem primeiro.",
    },
    {
      label: "Você copia",
      title: "Resumo pronto para o prontuário",
      kind: "output",
      lines: [
        "ANEMIA normocítica (Hb 9,1)",
        "LEUCOCITOSE com neutrofilia + PCR 142 — padrão infeccioso",
        "INJÚRIA RENAL: Cr 2,1 / U 88, com K 5,4 (atenção)",
        "Hiponatremia leve (Na 133)",
      ],
      note: "Um clique em Copiar e o texto vai para o prontuário.",
    },
  ],

  Clínicus: [
    {
      label: "Você dita",
      title: "Jogue as informações soltas",
      kind: "input",
      lines: [
        "Homem 62a, dor torácica há 2h, opressiva, irradia p/ MSE",
        "HAS, DM2, tabagista 30 maços-ano",
        "PA 160x95, FC 98, sat 96%",
      ],
      note: "Frases picadas, abreviações, ordem bagunçada — tudo bem.",
    },
    {
      label: "Você escolhe o contexto",
      title: "Consultório, enfermaria, emergência ou UTI",
      kind: "process",
      lines: [
        "Contexto: Emergência (avaliação inicial)",
        "Aplicando modelo de anamnese correspondente...",
        "Organizando HDA em texto contínuo...",
      ],
      note: "5 modelos. O texto muda de forma conforme o cenário.",
    },
    {
      label: "Você revisa e assina",
      title: "Anamnese estruturada e coerente",
      kind: "output",
      lines: [
        "IDENTIFICAÇÃO: Masculino, 62 anos.",
        "QP: Dor torácica há 2 horas.",
        "HDA: Paciente refere dor precordial de início súbito há duas horas, de caráter opressivo, com irradiação para membro superior esquerdo...",
        "ANTECEDENTES: HAS, DM2, tabagismo 30 maços-ano.",
      ],
      note: "Texto contínuo, sem tópicos quebrados.",
    },
  ],

  Scorius: [
    {
      label: "Você descreve",
      title: "Conte o caso, sem procurar a fórmula",
      kind: "input",
      lines: [
        "Mulher 78a, FA crônica, HAS, DM, AVC prévio",
        "Sem sangramento prévio, função renal normal",
        "Dúvida: anticoagular?",
      ],
    },
    {
      label: "Ele escolhe os escores",
      title: "O assistente seleciona o que se aplica",
      kind: "process",
      lines: ["CHA2DS2-VASc → indicado", "HAS-BLED → indicado", "Calculando e comparando risco..."],
      note: "Você não precisa lembrar qual escore usar.",
    },
    {
      label: "Você decide",
      title: "Valor, interpretação e o que fazer",
      kind: "output",
      lines: [
        "CHA2DS2-VASc = 7 — risco anual de AVC muito alto",
        "HAS-BLED = 2 — risco de sangramento moderado",
        "CONDUTA: benefício da anticoagulação supera o risco",
      ],
    },
  ],

  Numerus: [
    {
      label: "Você pergunta",
      title: "A conta em linguagem de plantão",
      kind: "input",
      lines: ["Noradrenalina 0,2 mcg/kg/min", "Paciente 68 kg", "Solução 4 amp em 250 mL — quantos mL/h?"],
    },
    {
      label: "Ele calcula",
      title: "Com o raciocínio à mostra",
      kind: "process",
      lines: [
        "Concentração: 16 mg / 250 mL = 64 mcg/mL",
        "Dose: 0,2 × 68 = 13,6 mcg/min",
        "Convertendo para mL/h...",
      ],
    },
    {
      label: "Você prescreve",
      title: "Resultado direto e conferível",
      kind: "output",
      lines: ["VAZÃO = 12,75 mL/h", "Cada passo do cálculo fica visível para conferência."],
      note: "Doses, infusões, conversões e correções.",
    },
  ],

  Prescriptus: [
    {
      label: "Você pergunta",
      title: "Dúvida real de prescrição",
      kind: "input",
      lines: ["Vancomicina em paciente com ClCr 32", "Peso 80 kg, infecção de pele complicada"],
    },
    {
      label: "Ele consulta",
      title: "Modo discussão ou Bula Inteligente",
      kind: "process",
      lines: ["Checando ajuste renal...", "Buscando interações relevantes...", "Filtrando o que muda a prescrição..."],
    },
    {
      label: "Você prescreve",
      title: "Só o que interessa da bula",
      kind: "output",
      lines: [
        "DOSE: ataque 25-30 mg/kg; manutenção ajustada ao ClCr",
        "AJUSTE RENAL: intervalo ampliado — monitorar vale",
        "ALERTA: nefrotoxicidade somada a AINEs e contraste",
      ],
    },
  ],

  CODexus: [
    {
      label: "Você descreve",
      title: "Escreva em linguagem clínica",
      kind: "input",
      lines: ["Pneumonia adquirida na comunidade, agente não identificado", "Internação em enfermaria"],
    },
    {
      label: "Ele codifica",
      title: "Busca o código correto e as alternativas",
      kind: "process",
      lines: ["Mapeando descrição → CID-10...", "Verificando compatibilidade TISS...", "Listando alternativas próximas..."],
    },
    {
      label: "Você fatura",
      title: "Código certo na primeira tentativa",
      kind: "output",
      lines: [
        "CID-10 PRINCIPAL: J18.9 — Pneumonia não especificada",
        "ALTERNATIVAS: J15.9, J13",
        "Observação: especificar agente eleva a precisão do faturamento",
      ],
      note: "Menos glosa, menos retrabalho.",
    },
  ],

  Gasometrus: [
    {
      label: "Você cola",
      title: "Os valores como saíram do aparelho",
      kind: "input",
      lines: ["pH 7,21 / pCO2 28 / HCO3 11 / BE -14", "Na 138 / Cl 100 / K 5,1 / Lactato 5,2"],
    },
    {
      label: "Ele lê em ordem",
      title: "Leitura sistemática, como à beira do leito",
      kind: "process",
      lines: [
        "1. Distúrbio primário...",
        "2. Compensação esperada...",
        "3. Ânion gap e delta-delta...",
      ],
    },
    {
      label: "Você age",
      title: "Diagnóstico e conduta imediata",
      kind: "output",
      lines: [
        "ACIDOSE METABÓLICA com ânion gap elevado (AG 27)",
        "Compensação respiratória adequada",
        "Lactato 5,2 — investigar hipoperfusão",
        "CONDUTA: ressuscitação volêmica e busca do foco",
      ],
    },
  ],

  Atestus: [
    {
      label: "Você informa",
      title: "Só o essencial",
      kind: "input",
      lines: ["Afastamento de 3 dias", "Quadro: lombalgia aguda", "Paciente solicitou CID"],
    },
    {
      label: "Ele formata",
      title: "Formato correto e sigilo preservado",
      kind: "process",
      lines: ["Aplicando modelo de atestado...", "Incluindo apenas o CID, sem descrever a doença..."],
    },
    {
      label: "Você assina",
      title: "Documento pronto",
      kind: "output",
      lines: [
        "ATESTADO MÉDICO",
        "Atesto, para os devidos fins, que o(a) paciente necessita de afastamento de suas atividades por 3 (três) dias a partir desta data.",
        "CID-10: M54.5",
      ],
      note: "Nunca descreve a doença por extenso — protege o paciente.",
    },
  ],

  Protocolus: [
    {
      label: "Você pergunta",
      title: "A dúvida do plantão",
      kind: "input",
      lines: ["Conduta atual em TEP de risco intermediário-alto"],
    },
    {
      label: "Ele busca",
      title: "Diretrizes globais, não o PDF inteiro",
      kind: "process",
      lines: ["Consultando ESC / AHA / OMS...", "Extraindo o fluxo prático...", "Resumindo em passos executáveis..."],
    },
    {
      label: "Você aplica",
      title: "Fluxo prático em passos",
      kind: "output",
      lines: [
        "1. Estratificar: PESI + disfunção de VD + troponina",
        "2. Anticoagulação plena imediata",
        "3. Monitorização em unidade com vigilância",
        "4. Trombólise de resgate se deterioração hemodinâmica",
      ],
    },
  ],

  Orientus: [
    {
      label: "Você resume",
      title: "Sua conduta, em linguagem médica",
      kind: "input",
      lines: ["Alta após ITU não complicada", "Nitrofurantoína 100 mg 6/6h por 5 dias", "Retorno se piora"],
    },
    {
      label: "Ele traduz",
      title: "Para a linguagem do paciente",
      kind: "process",
      lines: ["Removendo termos técnicos...", "Definindo sinais de alarme...", "Organizando horários do remédio..."],
    },
    {
      label: "Você entrega",
      title: "Orientação que o paciente cumpre",
      kind: "output",
      lines: [
        "COMO TOMAR: 1 comprimido a cada 6 horas, por 5 dias, mesmo que melhore antes.",
        "BEBA ÁGUA: pelo menos 2 litros por dia.",
        "PROCURE ATENDIMENTO SE: febre, dor nas costas, vômitos ou sangue na urina.",
      ],
      note: "Pronto para imprimir e entregar na alta.",
    },
  ],

  Mediscuss: [
    {
      label: "Você cola o caso",
      title: "Dados soltos do paciente",
      kind: "input",
      lines: [
        "Mulher 54a, pancreatite biliar, 3º dia",
        "Piora de dor, PCR em ascensão, febre 38,6",
        "Preciso de parecer da cirurgia",
      ],
    },
    {
      label: "Ele argumenta",
      title: "Monta a linha de raciocínio",
      kind: "process",
      lines: ["Selecionando o tipo de documento: parecer...", "Construindo justificativa clínica...", "Definindo a pergunta ao especialista..."],
    },
    {
      label: "Você envia",
      title: "Pedido de parecer bem escrito",
      kind: "output",
      lines: [
        "SOLICITAÇÃO DE PARECER — CIRURGIA GERAL",
        "Paciente em 3º dia de internação por pancreatite aguda biliar, evoluindo com piora álgica, febre e elevação de PCR.",
        "PERGUNTA: há indicação de abordagem cirúrgica nesta internação?",
      ],
      note: "Escrito como o especialista gostaria de receber.",
    },
  ],

  "Modo Escuta": [
    {
      label: "Você conversa",
      title: "Grave a consulta e olhe para o paciente",
      kind: "input",
      lines: [
        "● Gravando — 04:12",
        "Você não digita nada durante o atendimento.",
        "O microfone do próprio computador ou celular basta.",
      ],
      note: "Sem digitar. Sem virar as costas para o paciente.",
    },
    {
      label: "Ele transcreve",
      title: "Transcrição em tempo real",
      kind: "process",
      lines: [
        "Médico: há quanto tempo começou essa dor?",
        "Paciente: faz uns três dias, piora quando eu respiro fundo...",
        "Modo unificado ou com separação de falas — você escolhe.",
      ],
    },
    {
      label: "Ele estrutura",
      title: "A conversa vira anamnese",
      kind: "output",
      lines: [
        "QP: Dor torácica ventilatório-dependente há 3 dias.",
        "HDA: Refere início gradual, piora à inspiração profunda, sem irradiação...",
        "HIPÓTESES: pleurite, dor musculoesquelética.",
      ],
      note: "Copiar tudo ou salvar a consulta com um nome. Nada se perde.",
    },
  ],
};
