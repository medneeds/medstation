// Catálogo de funcionalidades do Copiloto MedStation — a fonte de verdade sobre o que
// existe na plataforma. Sem imports de Deno: o vitest lê este arquivo para garantir que
// toda rota de assistente/modo do app está aqui e que os ids batem com src/lib/copilot.ts.
//
// Ao criar um assistente, modo ou tela nova, acrescente uma entrada aqui (há teste).

export type CopilotKind = "assistente" | "modo" | "organizacao" | "conta";

export interface CopilotFeature {
  /** id estável: é o que a IA devolve como ação e o que o app transforma em botão */
  id: string;
  name: string;
  kind: CopilotKind;
  route: string;
  /** caminho da plataforma, quando houver */
  path?: "Documentação" | "Decisão" | "Fluxo";
  what: string;
  when: string;
  how: string[];
}

export const COPILOT_FEATURES: CopilotFeature[] = [
  // Documentação
  {
    id: "clinicus",
    name: "Clínicus",
    kind: "assistente",
    route: "/clinicus",
    path: "Documentação",
    what: "Transforma dados soltos do atendimento em anamnese, evolução, alta ou relatório prontos para o prontuário. Tem o modo Professor para estudo.",
    when: "Quando você já colheu a história e precisa escrever rápido e bem.",
    how: [
      "Escolha o contexto (consultório, enfermaria, emergência, UTI)",
      "Cole ou dite os dados do paciente",
      "Ative Anamnese ou Relatório e envie",
      "Revise e copie o texto final",
    ],
  },
  {
    id: "examinus",
    name: "Examinus",
    kind: "assistente",
    route: "/examinus",
    path: "Documentação",
    what: "Organiza e interpreta exames (texto, foto ou PDF) e, no modo consultor, sugere quais exames pedir.",
    when: "Ao receber resultados extensos ou na dúvida sobre a próxima investigação.",
    how: ["Cole os resultados ou envie foto/PDF", "Ligue os ajustes que quiser", "Envie e copie o resumo"],
  },
  {
    id: "mediscuss",
    name: "Mediscuss",
    kind: "assistente",
    route: "/mediscuss",
    path: "Documentação",
    what: "Monta pedidos de parecer, discussão de caso, internação, UTI, regulação ou transferência.",
    when: "Na hora de acionar outra equipe com clareza.",
    how: ["Cole os dados do caso", "Escolha o modo e a especialidade", "Revise e copie o texto"],
  },
  {
    id: "atestus",
    name: "Atestus",
    kind: "assistente",
    route: "/atestus",
    path: "Documentação",
    what: "Atestados e declarações com CID, sem descrever a doença.",
    when: "No fim do atendimento, quando o paciente precisa do documento.",
    how: ["Informe período e CID", "Gere e revise", "Copie"],
  },
  {
    id: "orientus",
    name: "Orientus",
    kind: "assistente",
    route: "/orientus",
    path: "Documentação",
    what: "Orientações de alta em linguagem que o paciente entende.",
    when: "Ao liberar o paciente.",
    how: ["Descreva diagnóstico e conduta", "Gere as orientações", "Entregue impresso ou por mensagem"],
  },
  // Decisão
  {
    id: "prescriptus",
    name: "Prescriptus",
    kind: "assistente",
    route: "/prescriptus",
    path: "Decisão",
    what: "Discussão de fármacos, doses e interações, e o Modo Receita, que entrega a prescrição formatada.",
    when: "Antes de prescrever ou quando quiser a receita pronta.",
    how: ["Descreva o caso e o objetivo terapêutico", "Ative o Modo Receita se quiser o documento pronto", "Revise sempre antes de assinar"],
  },
  {
    id: "gasometrus",
    name: "Gasometrus",
    kind: "assistente",
    route: "/gasometrus",
    path: "Decisão",
    what: "Interpretação de gasometria passo a passo, com conduta sugerida.",
    when: "Beira de leito, emergência e UTI.",
    how: ["Cole os valores da gasometria", "Opcional: ative a leitura sistemática", "Leia a interpretação e a conduta"],
  },
  {
    id: "scorius",
    name: "Scorius",
    kind: "assistente",
    route: "/scorius",
    path: "Decisão",
    what: "Escores clínicos e estratificação de risco aplicados ao caso.",
    when: "Quando precisa estratificar risco.",
    how: ["Informe os dados", "Escolha o escore", "Interprete o resultado"],
  },
  {
    id: "numerus",
    name: "Numerus",
    kind: "assistente",
    route: "/numerus",
    path: "Decisão",
    what: "Calculadoras por peso: drogas vasoativas, sedação, intubação e protocolos.",
    when: "Quando precisa de dose e diluição na hora.",
    how: ["Informe o peso", "Escolha a droga ou o protocolo", "Confira o resultado e copie"],
  },
  {
    id: "codexus",
    name: "CODexus",
    kind: "assistente",
    route: "/codexus",
    path: "Decisão",
    what: "Busca de CID-10 e codificação, com alternativas quando há dúvida. O modo D.A. ajuda com dias de afastamento.",
    when: "Ao fechar documentos e faturamento.",
    how: ["Digite o diagnóstico", "Escolha o código adequado"],
  },
  {
    id: "protocolus",
    name: "Protocolus",
    kind: "assistente",
    route: "/protocolus",
    path: "Decisão",
    what: "Protocolos e diretrizes direto ao ponto.",
    when: "Quando quer condutas embasadas em segundos.",
    how: ["Pergunte pelo protocolo ou cenário", "Leia os pontos-chave"],
  },
  {
    id: "legalis",
    name: "Legalis",
    kind: "assistente",
    route: "/legalis",
    path: "Decisão",
    what: "Orientação ética e jurídica: como registrar bem, dúvidas do CFM e situações sensíveis.",
    when: "Casos sensíveis, recusa de tratamento, conflitos.",
    how: ["Descreva a situação", "Receba orientação de conduta e de registro"],
  },
  // Fluxo
  {
    id: "modo_escuta",
    name: "Modo Escuta",
    kind: "modo",
    route: "/consultorio",
    path: "Fluxo",
    what: "Grava o atendimento, transcreve e devolve a anamnese estruturada. No fim, você pode ver e copiar a anamnese e a transcrição.",
    when: "Consultas em que você não quer digitar.",
    how: [
      "Abra o Modo Escuta e inicie a gravação (avise o paciente)",
      "Ao terminar, finalize: a anamnese é estruturada",
      "Veja ou copie a anamnese e a transcrição",
      "Salve o caso com nome, pasta e data",
    ],
  },
  {
    id: "consultas_salvas",
    name: "Consultas salvas",
    kind: "organizacao",
    route: "/consultorio/historico",
    path: "Fluxo",
    what: "Todos os atendimentos do Modo Escuta salvos, por pasta e por data.",
    when: "Para retomar, copiar ou comparar atendimentos.",
    how: ["Abra Consultas salvas", "Filtre por pasta ou data", "Abra e copie o que precisar"],
  },
  {
    id: "modo_rotineiro",
    name: "Modo Rotineiro",
    kind: "modo",
    route: "/rotina",
    path: "Fluxo",
    what: "Mapa de leitos da enfermaria ou UTI com evolução diária que herda o dia anterior, e o assistente Carpe Diem.",
    when: "Na visita diária de rotina.",
    how: [
      "Configure unidades e leitos",
      "Interne o paciente no leito",
      "Abra a evolução do dia, que já nasce herdada",
      "Descreva as mudanças e peça ao Carpe Diem para reescrever",
    ],
  },
  {
    id: "arquivo_altas",
    name: "Arquivo de altas",
    kind: "organizacao",
    route: "/rotina/arquivo",
    path: "Fluxo",
    what: "Pacientes que já saíram do Modo Rotineiro, com o histórico das evoluções.",
    when: "Para resgatar um caso antigo.",
    how: ["Abra o Arquivo de altas", "Busque pelo nome ou período"],
  },
  {
    id: "modo_operador",
    name: "Modo Operador",
    kind: "modo",
    route: "/operador",
    path: "Fluxo",
    what: "Resolve a burocracia: converte documentos (SOAP, transferência, interconsulta), organiza exames, pedidos de vaga, alto custo e respostas à auditoria. Também indica qual assistente usar.",
    when: "Quando a tarefa é papelada e não raciocínio clínico.",
    how: ["Escolha a ação na barra (ou Livre)", "Cole o texto ou anexe o arquivo", "Revise e copie o resultado"],
  },
  // Organização
  {
    id: "pacientes",
    name: "Meus Pacientes",
    kind: "organizacao",
    route: "/patients",
    what: "Cadastro dos seus pacientes, com alergias, marcadores clínicos e as respostas de assistentes salvas na ficha.",
    when: "Para acompanhar um paciente ao longo do tempo.",
    how: ["Cadastre o paciente", "Use Salvar na ficha nas respostas dos assistentes", "Abra a ficha para ver a linha do tempo"],
  },
  {
    id: "casos",
    name: "Casos Clínicos",
    kind: "organizacao",
    route: "/cases",
    what: "Casos clínicos organizados por paciente e por pasta, inclusive extraídos de um documento.",
    when: "Para guardar e retomar um caso completo.",
    how: ["Crie um caso ou importe de um documento", "Organize em pastas", "Abra o caso quando precisar"],
  },
  {
    id: "cofre",
    name: "Cofre Inteligente",
    kind: "organizacao",
    route: "/notes",
    what: "Suas anotações e textos salvos dos assistentes, em pastas, com favoritos.",
    when: "Para guardar modelos, condutas e textos que você reutiliza.",
    how: ["Use Salvar no Cofre nas respostas", "Organize em pastas", "Busque e copie quando precisar"],
  },
  {
    id: "prescricoes",
    name: "Banco de Prescrições",
    kind: "organizacao",
    route: "/prescricoes",
    what: "Cria, guarda e imprime prescrições, inclusive controle especial em duas vias e PDF oficial, com modelos reutilizáveis.",
    when: "Para emitir a receita do paciente.",
    how: ["Crie uma nova prescrição (dá para ditar)", "Use um modelo salvo se quiser", "Imprima ou gere o PDF oficial"],
  },
  {
    id: "exames",
    name: "Solicitações de Exames",
    kind: "organizacao",
    route: "/exames",
    what: "Cria e imprime pedidos de exames para o paciente.",
    when: "Para pedir exames de forma organizada.",
    how: ["Crie uma nova solicitação", "Escolha os exames", "Imprima ou gere o PDF"],
  },
  {
    id: "documentos",
    name: "Emitir Documentos",
    kind: "organizacao",
    route: "/documentos",
    what: "Emissão de documentos médicos a partir dos dados do paciente.",
    when: "Quando precisa de um documento formal.",
    how: ["Escolha o tipo de documento", "Preencha ou gere com IA", "Revise e imprima"],
  },
  // Conta
  {
    id: "indicar",
    name: "Indique e ganhe",
    kind: "conta",
    route: "/indicar",
    what: "Seu link de indicação para colegas.",
    when: "Quando um colega perguntar da plataforma.",
    how: ["Copie seu link", "Envie ao colega", "Acompanhe as indicações"],
  },
  {
    id: "configuracoes",
    name: "Perfil e assinatura",
    kind: "conta",
    route: "/settings",
    what: "Seus dados, timbrado das receitas, aparelhos confiáveis, privacidade e gestão do plano.",
    when: "Para ajustar conta, timbrado e pagamento.",
    how: ["Abra Perfil", "Ajuste o que precisar"],
  },
];

export const COPILOT_FEATURE_IDS = COPILOT_FEATURES.map((f) => f.id);

/** Máximo de botões de ação por resposta. */
export const COPILOT_MAX_ACTIONS = 3;

export function buildCopilotSystemPrompt(): string {
  const catalog = COPILOT_FEATURES.map((f) => {
    const path = f.path ? ` | caminho ${f.path}` : "";
    return `- id "${f.id}" — ${f.name} (${f.kind}${path})\n  O que faz: ${f.what}\n  Quando usar: ${f.when}\n  Como usar: ${f.how.join("; ")}.`;
  }).join("\n");

  return `Você é o Copiloto MedStation, a inteligência da própria plataforma. Você conversa com médicos e estudantes de medicina JÁ LOGADOS e ajuda cada um a tirar o melhor proveito da MedStation: tirar dúvidas de uso, descobrir funcionalidades e chegar ao assistente certo para a tarefa.

COMO A PLATAFORMA SE ORGANIZA
Três caminhos: Documentação (transformar informação clínica em texto pronto), Decisão (segunda camada de raciocínio no plantão) e Fluxo (voz, rotina de leitos e burocracia). Chame as ferramentas de "assistentes", nunca de "agentes".

CATÁLOGO COMPLETO (só isto existe; não invente telas, botões ou recursos)
${catalog}

REGRAS
- Português brasileiro, tom de colega experiente: direto, acolhedor, sem enrolação. No máximo 90 palavras.
- Responda só sobre o uso da MedStation. Se pedirem conduta clínica para um paciente, diga em uma frase que quem responde isso é o assistente adequado e indique-o.
- Nunca peça nem repita dados de paciente.
- Se algo não estiver no catálogo, diga que não existe ou que a equipe pode confirmar pelo suporte.
- Não fale de preços, descontos ou prazos de cobrança: indique Perfil e assinatura.
- Sem markdown: nada de #, * ou **. Use frases curtas e, se precisar, linhas começando com "- ".

FORMATO DA RESPOSTA — OBRIGATÓRIO
Responda APENAS com um objeto JSON válido, sem texto antes ou depois:
{"resposta": "<seu texto>", "acoes": ["<id>", ...]}
"acoes" lista de 0 a ${COPILOT_MAX_ACTIONS} ids do catálogo que a pessoa deveria abrir agora, do mais útil para o menos útil. Use [] quando nenhuma tela ajudar.`;
}

export interface CopilotReply {
  reply: string;
  actions: string[];
}

/**
 * Lê a resposta do modelo. Aceita JSON puro, JSON dentro de cerca de código ou texto
 * solto (vira resposta sem ações). Ações fora do catálogo, repetidas ou além do
 * limite são descartadas — a IA nunca cria um destino que não existe.
 */
export function parseCopilotReply(raw: string): CopilotReply {
  const text = (raw ?? "").trim();
  const candidates = [text, text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")];
  const braces = text.match(/\{[\s\S]*\}/);
  if (braces) candidates.push(braces[0]);

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as { resposta?: unknown; acoes?: unknown };
      if (parsed && typeof parsed.resposta === "string" && parsed.resposta.trim()) {
        const valid = new Set(COPILOT_FEATURE_IDS);
        const actions = Array.isArray(parsed.acoes)
          ? [...new Set(parsed.acoes.filter((a): a is string => typeof a === "string" && valid.has(a)))].slice(
              0,
              COPILOT_MAX_ACTIONS,
            )
          : [];
        return { reply: stripMarkdown(parsed.resposta.trim()), actions };
      }
    } catch {
      /* tenta o próximo formato */
    }
  }
  return { reply: stripMarkdown(text), actions: [] };
}

function stripMarkdown(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "");
}
