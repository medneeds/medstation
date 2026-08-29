import type { DiscoveryPathId } from "@/lib/discoveryPaths";

export type RoutinePain =
  | "documentation"
  | "exams"
  | "clinical_decision"
  | "calculations"
  | "rounding"
  | "voice";

export type WorkSetting = "emergency" | "icu" | "ward" | "outpatient" | "other";

export type PrimaryGoal =
  | "less_typing"
  | "faster_decisions"
  | "standardization"
  | "organized_workflow"
  | "less_rework";

export interface OnboardingAnswers {
  routinePains: RoutinePain[];
  workSettings: WorkSetting[];
  primaryGoals: PrimaryGoal[];
}

export interface OnboardingRecommendation {
  primaryPath: DiscoveryPathId;
  recommendedTools: string[];
}

const MAX_TOOLS = 5;

/** Pesos determinísticos e documentados do motor de recomendação. */
export const SCORE_WEIGHTS = {
  pathPerPain: 3,
  pathPerGoal: 2,
  toolPerPain: 5,
  toolPerGoal: 3,
  toolPerSetting: 2,
} as const;

/** Fallback técnico de desempate final. */
const PATH_FALLBACK_ORDER: DiscoveryPathId[] = ["documentation", "copilot", "workflow"];


const PAIN_RULES: Record<RoutinePain, { path: DiscoveryPathId; tools: string[] }> = {
  documentation: { path: "documentation", tools: ["clinicus", "examinus", "mediscuss"] },
  exams: { path: "documentation", tools: ["examinus", "clinicus"] },
  clinical_decision: { path: "copilot", tools: ["mediscuss", "protocolus", "prescriptus"] },
  calculations: { path: "copilot", tools: ["gasometrus", "scorius", "numerus"] },
  rounding: { path: "workflow", tools: ["modo_rotineiro", "clinicus", "mediscuss"] },
  voice: { path: "workflow", tools: ["modo_escuta", "clinicus", "modo_rotineiro"] },
};

const SETTING_PRIORITY: Record<WorkSetting, string[]> = {
  emergency: ["protocolus", "gasometrus", "mediscuss"],
  icu: ["gasometrus", "modo_rotineiro", "mediscuss"],
  ward: ["modo_rotineiro", "clinicus", "mediscuss"],
  outpatient: ["modo_escuta", "clinicus", "orientus"],
  other: [],
};

const GOAL_RULES: Record<PrimaryGoal, { paths: DiscoveryPathId[]; tools: string[] }> = {
  less_typing: {
    paths: ["documentation", "workflow"],
    tools: ["clinicus", "modo_escuta", "examinus"],
  },
  faster_decisions: {
    paths: ["copilot"],
    tools: ["mediscuss", "protocolus", "prescriptus"],
  },
  standardization: {
    paths: ["documentation"],
    tools: ["clinicus", "examinus"],
  },
  organized_workflow: {
    paths: ["workflow"],
    tools: ["modo_rotineiro", "modo_escuta"],
  },
  less_rework: {
    paths: ["workflow", "documentation"],
    tools: ["modo_rotineiro", "clinicus"],
  },
};

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/**
 * Motor determinístico de recomendação (sem IA, sem chamadas externas).
 *
 * Caminho: cada dor selecionada soma +3 ao caminho correspondente e cada
 * objetivo soma +2 aos caminhos associados. O local de atuação não altera o
 * caminho, apenas a prioridade das ferramentas.
 *
 * Ferramentas: +5 por dor, +3 por objetivo, +2 por local de atuação.
 * Empates de caminho são resolvidos pela primeira dor selecionada e, se ainda
 * houver empate, pela ordem técnica documentação > copiloto > fluxo.
 */
export function recommendFromAnswers(answers: OnboardingAnswers): OnboardingRecommendation {
  const pains = dedupe(answers.routinePains ?? []) as RoutinePain[];
  const settings = dedupe(answers.workSettings ?? []) as WorkSetting[];
  const goals = dedupe(answers.primaryGoals ?? []) as PrimaryGoal[];

  const pathScore: Record<DiscoveryPathId, number> = { documentation: 0, copilot: 0, workflow: 0 };
  const toolScore = new Map<string, number>();
  const order: string[] = [];

  const addTool = (slug: string, weight: number) => {
    if (!toolScore.has(slug)) order.push(slug);
    toolScore.set(slug, (toolScore.get(slug) ?? 0) + weight);
  };

  for (const pain of pains) {
    const rule = PAIN_RULES[pain];
    if (!rule) continue;
    pathScore[rule.path] += SCORE_WEIGHTS.pathPerPain;
    rule.tools.forEach((t) => addTool(t, SCORE_WEIGHTS.toolPerPain));
  }

  for (const goal of goals) {
    const rule = GOAL_RULES[goal];
    if (!rule) continue;
    rule.paths.forEach((p) => { pathScore[p] += SCORE_WEIGHTS.pathPerGoal; });
    rule.tools.forEach((t) => addTool(t, SCORE_WEIGHTS.toolPerGoal));
  }

  for (const setting of settings) {
    (SETTING_PRIORITY[setting] ?? []).forEach((t) => addTool(t, SCORE_WEIGHTS.toolPerSetting));
  }

  const best = Math.max(pathScore.documentation, pathScore.copilot, pathScore.workflow);
  const tied = PATH_FALLBACK_ORDER.filter((p) => pathScore[p] === best);

  let primaryPath: DiscoveryPathId = tied[0];
  if (tied.length > 1) {
    const firstPainPath = pains.length ? PAIN_RULES[pains[0]]?.path : undefined;
    if (firstPainPath && tied.includes(firstPainPath)) primaryPath = firstPainPath;
  }

  const recommendedTools = order
    .map((slug, index) => ({ slug, index, score: toolScore.get(slug) ?? 0 }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, MAX_TOOLS)
    .map((t) => t.slug);

  return { primaryPath, recommendedTools };
}


export const ROUTINE_PAIN_OPTIONS: { value: RoutinePain; label: string }[] = [
  { value: "documentation", label: "Documentar atendimentos, evoluções e altas" },
  { value: "exams", label: "Organizar e resumir exames" },
  { value: "clinical_decision", label: "Consultar condutas, medicamentos e discutir casos" },
  { value: "calculations", label: "Gasometria, scores e cálculos" },
  { value: "rounding", label: "Evoluir vários pacientes ou leitos" },
  { value: "voice", label: "Transformar consulta ou visita por voz em registro" },
];

export const WORK_SETTING_OPTIONS: { value: WorkSetting; label: string }[] = [
  { value: "emergency", label: "Emergência" },
  { value: "icu", label: "UTI" },
  { value: "ward", label: "Enfermaria" },
  { value: "outpatient", label: "Consultório / Ambulatório" },
  { value: "other", label: "Outro" },
];

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: "less_typing", label: "Menos tempo digitando" },
  { value: "faster_decisions", label: "Mais agilidade nas decisões clínicas" },
  { value: "standardization", label: "Registros mais padronizados" },
  { value: "organized_workflow", label: "Rotina mais organizada" },
  { value: "less_rework", label: "Menos retrabalho" },
];

const PATH_REASON: Record<DiscoveryPathId, string> = {
  documentation:
    "Suas respostas indicam maior esforço na produção de texto clínico. O caminho Documentação concentra as ferramentas que geram registros prontos para revisão.",
  copilot:
    "Suas respostas indicam necessidade de apoio para decidir e calcular durante o atendimento. O caminho Copiloto reúne consulta, cálculo e discussão clínica.",
  workflow:
    "Suas respostas indicam trabalho repetitivo ao longo da rotina. O caminho Fluxo integra voz, evolução de leitos e continuidade entre os dias.",
};

export function explainRecommendation(path: DiscoveryPathId, selectionCount = 1): string {
  const base = PATH_REASON[path];
  if (selectionCount > 1) {
    return `${base} As demais respostas foram consideradas na ordem das ferramentas sugeridas.`;
  }
  return base;
}

