import { describe, expect, it } from "vitest";
import {
  OPERADOR_ACTION_IDS,
  OPERADOR_REFERRAL_TARGETS,
  buildOperadorPrompt,
  validateOperadorRequest,
} from "../../../supabase/functions/agent-chat/operador";
import { selectAgentModel } from "../../../supabase/functions/agent-chat/model-routing";
import {
  OPERADOR_ACTIONS,
  OPERADOR_REFERRAL_URLS,
  operadorActionForPath,
  splitOperadorReferrals,
} from "../operador";

describe("Modo Operador", () => {
  it("a barra de ações oferece exatamente as ações que o servidor aceita", () => {
    expect(OPERADOR_ACTIONS.map((a) => a.value).sort()).toEqual([...OPERADOR_ACTION_IDS].sort());
  });

  it("todo assistente que o servidor pode indicar vira atalho no navegador", () => {
    expect(Object.keys(OPERADOR_REFERRAL_URLS).sort()).toEqual([...OPERADOR_REFERRAL_TARGETS].sort());
  });

  it("subitens do menu abrem na ação certa", () => {
    expect(operadorActionForPath("/operador")).toBe("livre");
    expect(operadorActionForPath("/operador/converter")).toBe("converter");
    expect(operadorActionForPath("/operador/exames")).toBe("exames");
  });

  it("recusa ação desconhecida ou enviada para outro assistente", () => {
    expect(validateOperadorRequest({ agentType: "operador", operadorAction: "soap" })).toBeNull();
    expect(validateOperadorRequest({ agentType: "operador" })).toBeNull();
    expect(validateOperadorRequest({ agentType: "operador", operadorAction: "hackear" })).not.toBeNull();
    expect(validateOperadorRequest({ agentType: "clinicus", operadorAction: "soap" })).not.toBeNull();
  });

  it("conversa livre e escolha de assistente usam a IA rápida; documentos usam a mais forte", () => {
    expect(selectAgentModel({ agentType: "operador", operadorAction: "livre" }).model).toBe("google/gemini-3-flash-preview");
    expect(selectAgentModel({ agentType: "operador", operadorAction: "qual_assistente" }).model).toBe("google/gemini-3-flash-preview");
    expect(selectAgentModel({ agentType: "operador", operadorAction: "soap" })).toEqual({ model: "openai/gpt-6-astra", useResponsesApi: true });
    expect(selectAgentModel({ agentType: "operador", operadorAction: "exames" }).model).toBe("openai/gpt-6-astra");
  });

  it("organizar exames mantém laboratório e gasometria separados", () => {
    expect(buildOperadorPrompt("exames")).toContain("laboratório e gasometria sempre separados");
  });

  it("indicação sai do texto copiado e vira atalho", () => {
    const { body, referrals } = splitOperadorReferrals(
      "SUBJETIVO\nDor torácica.\n\nASSISTENTE INDICADO: Gasometrus — leitura completa da gasometria\nASSISTENTE INDICADO: modo rotineiro — acompanhar o leito",
    );
    expect(body).toBe("SUBJETIVO\nDor torácica.");
    expect(referrals).toEqual([
      { name: "Gasometrus", url: "/gasometrus", reason: "leitura completa da gasometria" },
      { name: "Modo Rotineiro", url: "/rotina", reason: "acompanhar o leito" },
    ]);
  });

  it("nome fora da lista não vira atalho e continua no texto", () => {
    const { body, referrals } = splitOperadorReferrals("Texto\nASSISTENTE INDICADO: Dr. House — opinião");
    expect(referrals).toEqual([]);
    expect(body).toContain("Dr. House");
  });
});
