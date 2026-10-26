// Escolha da IA por assistente. Pedidos que vão para a IA mais forte usam a API
// Responses; os demais seguem na IA rápida padrão.
export const FAST_AGENT_MODEL = "google/gemini-3-flash-preview";
export const STRONG_AGENT_MODEL = "openai/gpt-6-astra";

export interface AgentModelRequest {
  agentType: string;
  directAHEMode?: boolean;
  aheTemplate?: string;
}

export function selectAgentModel({ agentType, directAHEMode, aheTemplate }: AgentModelRequest): {
  model: string;
  useResponsesApi: boolean;
} {
  const institutionalUti = agentType === "clinicus" && Boolean(directAHEMode) && aheTemplate === "uti_evolucao_v2";
  // Mediscuss: a IA mais forte zerou quase todos os dados inventados na auditoria de out/2026.
  const strong = institutionalUti || agentType === "mediscuss";
  return strong
    ? { model: STRONG_AGENT_MODEL, useResponsesApi: true }
    : { model: FAST_AGENT_MODEL, useResponsesApi: false };
}
