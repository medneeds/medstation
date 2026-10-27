// Escolha da IA por assistente. Pedidos que vão para a IA mais forte usam a API
// Responses; os demais seguem na IA rápida padrão.
import { OPERADOR_FAST_ACTIONS, isOperadorAction } from "./operador.ts";

export const FAST_AGENT_MODEL = "google/gemini-3-flash-preview";
export const STRONG_AGENT_MODEL = "openai/gpt-6-astra";

export interface AgentModelRequest {
  agentType: string;
  directAHEMode?: boolean;
  aheTemplate?: string;
  operadorAction?: string;
}

export function selectAgentModel({ agentType, directAHEMode, aheTemplate, operadorAction }: AgentModelRequest): {
  model: string;
  useResponsesApi: boolean;
} {
  const institutionalUti = agentType === "clinicus" && Boolean(directAHEMode) && aheTemplate === "uti_evolucao_v2";
  // Mediscuss: a IA mais forte zerou quase todos os dados inventados na auditoria de out/2026.
  // Modo Operador: ações que reescrevem documento clínico pedem a mesma fidelidade.
  const operadorDocument = agentType === "operador"
    && isOperadorAction(operadorAction)
    && !OPERADOR_FAST_ACTIONS.includes(operadorAction);
  const strong = institutionalUti || agentType === "mediscuss" || operadorDocument;
  return strong
    ? { model: STRONG_AGENT_MODEL, useResponsesApi: true }
    : { model: FAST_AGENT_MODEL, useResponsesApi: false };
}
