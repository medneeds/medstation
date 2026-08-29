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
  routinePain: RoutinePain;
  workSetting: WorkSetting;
  primaryGoal: PrimaryGoal;
}

export interface OnboardingRecommendation {
  primaryPath: DiscoveryPathId;
  recommendedTools: string[];
}

const MAX_TOOLS = 5;

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
 * Motor determinístico de recomendação. Sem IA, sem chamadas externas:
 * a resposta 1 define o caminho base, o contexto reordena e o objetivo
 * apenas reforça o que já foi indicado.
 */
export function recommendFromAnswers(answers: OnboardingAnswers): OnboardingRecommendation {
  const pain = PAIN_RULES[answers.routinePain];
  const goal = GOAL_RULES[answers.primaryGoal];

  // O caminho da dor principal prevalece; o objetivo só é usado como desempate
  // quando ele não contradiz a resposta 1.
  const primaryPath: DiscoveryPathId = goal.paths.includes(pain.path) ? pain.path : pain.path;

  const settingPriority = SETTING_PRIORITY[answers.workSetting];
  const base = dedupe([...pain.tools, ...goal.tools]);

  // Reordena colocando primeiro as ferramentas já sugeridas que combinam com
  // o local de atuação, sem remover nenhuma sugestão original.
  const promoted = base.filter((t) => settingPriority.includes(t));
  const rest = base.filter((t) => !settingPriority.includes(t));
  const contextExtras = settingPriority.filter((t) => !base.includes(t));

  const ordered = dedupe([...promoted, ...rest, ...contextExtras]);

  return { primaryPath, recommendedTools: ordered.slice(0, MAX_TOOLS) };
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

export function explainRecommendation(path: DiscoveryPathId): string {
  return PATH_REASON[path];
}
