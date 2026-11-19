/**
 * Declarative code inventory for the admin console.
 * NOT an uptime probe, deployment detector, or live feature flag.
 * Keep separated from execution of clinical tools.
 */
export type AICoreStage = "implemented" | "tested" | "pending";
export interface AICoreCapability {
  id: string;
  name: string;
  detail: string;
  stage: AICoreStage;
  area: "Infraestrutura" | "Hermes" | "Clínica";
}
export const AI_CORE_CAPABILITIES: readonly AICoreCapability[] = [
  {
    id: "models", name: "Catálogo de modelos",
    detail: "Identificadores e roteamento central da camada de IA",
    stage: "implemented", area: "Infraestrutura",
  },
  {
    id: "costs", name: "Custos e observabilidade",
    detail: "Custo sem tarifa conhecida permanece indeterminado, não gratuito",
    stage: "implemented", area: "Infraestrutura",
  },
  {
    id: "providers", name: "Adaptador de provedores",
    detail: "Google Gemini direto disponível por opt-in no Copiloto; não ativado por este painel",
    stage: "implemented", area: "Infraestrutura",
  },
  {
    id: "bridge", name: "Hermes ↔ MCP",
    detail: "CLI oficial detectou uma ferramenta sintética no runner de CI",
    stage: "tested", area: "Hermes",
  },
  {
    id: "workflow", name: "Plano Clínicus + Examinus",
    detail: "Contrato e execução simulada sem acessar dados de pacientes",
    stage: "tested", area: "Clínica",
  },
  {
    id: "staging", name: "Homologação persistente",
    detail: "Falta projeto isolado e credenciais temporárias de teste",
    stage: "pending", area: "Infraestrutura",
  },
  {
    id: "hermes-live", name: "Hermes com inferência real",
    detail: "Nenhum modelo Hermes foi conectado ao executor clínico",
    stage: "pending", area: "Hermes",
  },
  {
    id: "clinical-execution", name: "Execução clínica integrada",
    detail: "Exige autorização server-side, testes clínicos e revisão médica",
    stage: "pending", area: "Clínica",
  },
];

export const AI_CORE_MODEL_ROUTES = [
  { purpose: "Agentes clínicos rápidos", model: "google/gemini-3-flash-preview", description: "Rota padrão do agent-chat" },
  { purpose: "Mediscuss / UTI / PSF", model: "openai/gpt-6-astra", description: "Rota forte preservada" },
  { purpose: "OCR", model: "google/gemini-3.7-flash", description: "Rota primária" },
  { purpose: "ECG e radiologia", model: "google/gemini-3.1-pro-preview", description: "Interpretação multimodal" },
  { purpose: "Copiloto de navegação", model: "google/gemini-2.5-flash", description: "Rota histórica; direto é opt-in" },
] as const;
