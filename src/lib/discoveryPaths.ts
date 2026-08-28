import {
  Activity,
  BookOpen,
  Compass,
  FileCheck,
  FileText,
  FlaskConical,
  Layers,
  Mic,
  MessagesSquare,
  Pill,
  Scale,
  Sigma,
  Stethoscope,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type DiscoveryPathId = "documentation" | "copilot" | "workflow";

export interface DiscoveryTool {
  /** slug seguro usado em analytics — nunca texto livre */
  slug: string;
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
}

export interface DiscoveryPath {
  id: DiscoveryPathId;
  label: string;
  tagline: string;
  /** confirmação curta exibida ao selecionar o caminho */
  confirmation: string;
  icon: LucideIcon;
  examples: string[];
  tools: DiscoveryTool[];
}

export const DISCOVERY_PATHS: DiscoveryPath[] = [
  {
    id: "documentation",
    label: "Documentação",
    intent: "Quero parar de perder tempo digitando.",
    confirmation: "A MedStation transforma o que você já tem em texto clínico pronto.",
    tagline: "Transforme informação clínica em texto pronto para usar.",
    icon: FileText,
    examples: [
      "Resumir exames",
      "Estruturar anamnese",
      "Evolução e alta",
      "Pareceres e relatórios",
      "Atestados e orientações",
    ],
    tools: [
      { slug: "examinus", title: "Examinus", description: "Resuma exames em segundos", url: "/examinus", icon: FlaskConical },
      { slug: "clinicus", title: "Clínicus", description: "Anamnese, evolução, alta e relatórios", url: "/clinicus", icon: Stethoscope },
      { slug: "mediscuss", title: "Mediscuss", description: "Pareceres, discussão e regulação", url: "/mediscuss", icon: MessagesSquare },
      { slug: "atestus", title: "Atestus", description: "Atestados prontos", url: "/atestus", icon: FileCheck },
      { slug: "orientus", title: "Orientus", description: "Orientações claras ao paciente", url: "/orientus", icon: Compass },
    ],
  },
  {
    id: "copilot",
    label: "Copiloto",
    intent: "Quero apoio para decidir mais rápido.",
    confirmation: "A MedStation entra quando você precisa consultar, calcular ou discutir.",
    tagline: "Ganhe uma segunda camada de raciocínio no plantão.",
    icon: Activity,
    examples: [
      "Medicamentos e prescrição",
      "Gasometria",
      "Scores e cálculos",
      "CID-10",
      "Protocolos",
      "Discussão clínica",
      "Ética e proteção jurídica",
    ],
    tools: [
      { slug: "prescriptus", title: "Prescriptus", description: "Medicamentos e prescrição", url: "/prescriptus", icon: Pill },
      { slug: "gasometrus", title: "Gasometrus", description: "Interprete gasometria", url: "/gasometrus", icon: Wind },
      { slug: "scorius", title: "Scorius", description: "Scores e risco", url: "/scorius", icon: Activity },
      { slug: "numerus", title: "Numerus", description: "Cálculos médicos", url: "/numerus", icon: Sigma },
      { slug: "codexus", title: "CODexus", description: "Encontre o CID-10", url: "/codexus", icon: FileText },
      { slug: "protocolus", title: "Protocolus", description: "Protocolos na hora", url: "/protocolus", icon: BookOpen },
      { slug: "mediscuss", title: "Mediscuss", description: "Discuta o caso", url: "/mediscuss", icon: MessagesSquare },
      { slug: "legalis", title: "Legalis", description: "Ética e proteção jurídica", url: "/legalis", icon: Scale },
    ],
  },
  {
    id: "workflow",
    label: "Fluxo",
    intent: "Quero que minha rotina trabalhe comigo.",
    confirmation: "A MedStation acompanha o trabalho ao longo da consulta, visita e evolução.",
    tagline: "Reduza o trabalho repetitivo da sua rotina.",
    icon: Layers,
    examples: [
      "Consulta por voz → anamnese",
      "Evoluções por voz",
      "Modo Rotineiro",
      "Visita de enfermaria/UTI",
      "Continuidade entre leitos e dias",
    ],
    tools: [
      { slug: "modo_escuta", title: "Modo Escuta", description: "Consulta por voz → anamnese estruturada", url: "/consultorio", icon: Mic },
      { slug: "modo_rotineiro", title: "Modo Rotineiro", description: "Evolua leitos sem reconstruir tudo todo dia", url: "/rotina", icon: Layers },
      { slug: "consultas_salvas", title: "Consultas salvas", description: "Retome atendimentos já gravados", url: "/consultorio/historico", icon: FileCheck },
    ],
  },
];

/** Catálogo completo dos assistentes, reaproveitado na seção "Ver todas as ferramentas". */
export const ALL_ASSISTANTS: DiscoveryTool[] = [
  { slug: "clinicus", title: "Clínicus", description: "Sua anamnese pronta", url: "/clinicus", icon: Stethoscope },
  { slug: "examinus", title: "Examinus", description: "Resuma exames em segundos", url: "/examinus", icon: FlaskConical },
  { slug: "scorius", title: "Scorius", description: "Calcule scores e risco em segundos", url: "/scorius", icon: Activity },
  { slug: "numerus", title: "Numerus", description: "Calculadoras médicas instantâneas", url: "/numerus", icon: Sigma },
  { slug: "prescriptus", title: "Prescriptus", description: "Bula inteligente e consulta de medicamentos", url: "/prescriptus", icon: Pill },
  { slug: "codexus", title: "CODexus", description: "Encontre o CID-10 certo na hora", url: "/codexus", icon: FileText },
  { slug: "gasometrus", title: "Gasometrus", description: "Leia gasometria na hora", url: "/gasometrus", icon: Wind },
  { slug: "atestus", title: "Atestus", description: "Atestados prontos em um clique", url: "/atestus", icon: FileCheck },
  { slug: "protocolus", title: "Protocolus", description: "Protocolos atualizados na hora", url: "/protocolus", icon: BookOpen },
  { slug: "orientus", title: "Orientus", description: "Orientações claras para o paciente", url: "/orientus", icon: Compass },
  { slug: "mediscuss", title: "Mediscuss", description: "Pareceres, discussões e regulação prontos", url: "/mediscuss", icon: MessagesSquare },
  { slug: "legalis", title: "Legalis", description: "Proteção jurídica e dúvidas éticas (CFM)", url: "/legalis", icon: Scale },
];

/** Blocos do painel "Descubra a MedStation". */
export const DISCOVERY_BLOCKS = [
  {
    title: "Documente menos. Atenda mais.",
    line: "A MedStation escreve o texto clínico a partir do que você já tem.",
    examples: ["Resumo de exames", "Anamnese estruturada", "Alta e relatórios"],
  },
  {
    title: "Pense com apoio quando precisar.",
    line: "Uma segunda camada de raciocínio para decisões de plantão.",
    examples: ["Prescrição e bula", "Gasometria e scores", "Protocolos e CID-10"],
  },
  {
    title: "Organize sua rotina sem reconstruir tudo.",
    line: "A visita de hoje começa de onde a de ontem parou.",
    examples: ["Consulta por voz", "Evolução de leitos", "Continuidade entre dias"],
  },
];

/** Chave de preferência local do caminho escolhido (nunca vai ao banco). */
export const DISCOVERY_PATH_STORAGE_KEY = "medstation:discovery-path";

export function isDiscoveryPathId(value: unknown): value is DiscoveryPathId {
  return value === "documentation" || value === "copilot" || value === "workflow";
}

export function readStoredDiscoveryPath(): DiscoveryPathId | null {
  try {
    const raw = window.localStorage.getItem(DISCOVERY_PATH_STORAGE_KEY);
    return isDiscoveryPathId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeDiscoveryPath(id: DiscoveryPathId): void {
  try {
    window.localStorage.setItem(DISCOVERY_PATH_STORAGE_KEY, id);
  } catch {
    /* preferência local é opcional */
  }
}
