import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import {
  COPILOT_FEATURES,
  COPILOT_FEATURE_IDS,
  COPILOT_MAX_ACTIONS,
  buildCopilotSystemPrompt,
  parseCopilotReply,
} from "../../../supabase/functions/copilot-chat/catalog";
import { resolveCopilotActions } from "../copilot";
import { ALL_ASSISTANTS, DISCOVERY_PATHS } from "../discoveryPaths";

const appSource = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const appRoutes = new Set(
  [...appSource.matchAll(/path="([^"]+)"/g), ...appSource.matchAll(/"(\/operador[^"]*)"/g)].map((m) => m[1]),
);
const catalogRoutes = new Set(COPILOT_FEATURES.map((f) => f.route));

describe("catálogo do Copiloto", () => {
  it("cada id é único", () => {
    expect(new Set(COPILOT_FEATURE_IDS).size).toBe(COPILOT_FEATURE_IDS.length);
  });

  it("todo destino do catálogo é uma rota que existe no app", () => {
    const missing = COPILOT_FEATURES.filter((f) => !appRoutes.has(f.route)).map((f) => f.route);
    expect(missing).toEqual([]);
  });

  it("todo assistente e ferramenta dos caminhos está no catálogo (assistente novo exige entrada nova)", () => {
    const urls = [...ALL_ASSISTANTS, ...DISCOVERY_PATHS.flatMap((p) => p.tools)].map((t) => t.url);
    expect(urls.filter((u) => !catalogRoutes.has(u))).toEqual([]);
  });

  it("as instruções da IA citam todos os ids do catálogo", () => {
    const prompt = buildCopilotSystemPrompt();
    for (const id of COPILOT_FEATURE_IDS) expect(prompt).toContain(`id "${id}"`);
  });
});

describe("leitura da resposta do Copiloto", () => {
  it("lê o JSON e mantém só ações do catálogo, sem repetir, no limite", () => {
    const raw = JSON.stringify({
      resposta: "Use o **Clínicus** para isso.",
      acoes: ["clinicus", "inexistente", "clinicus", "examinus", "atestus", "orientus"],
    });
    expect(parseCopilotReply(raw)).toEqual({
      reply: "Use o Clínicus para isso.",
      actions: ["clinicus", "examinus", "atestus"].slice(0, COPILOT_MAX_ACTIONS),
    });
  });

  it("aceita JSON dentro de cerca de código", () => {
    const raw = '```json\n{"resposta":"Abra o Modo Escuta.","acoes":["modo_escuta"]}\n```';
    expect(parseCopilotReply(raw)).toEqual({ reply: "Abra o Modo Escuta.", actions: ["modo_escuta"] });
  });

  it("texto solto vira resposta sem botões", () => {
    expect(parseCopilotReply("Resposta sem JSON")).toEqual({ reply: "Resposta sem JSON", actions: [] });
  });

  it("no app, só ids do catálogo viram botão", () => {
    const actions = resolveCopilotActions(["prescricoes", "rota-falsa", 42, "prescricoes", "numerus"]);
    expect(actions.map((a) => a.route)).toEqual(["/prescricoes", "/numerus"]);
    expect(resolveCopilotActions("clinicus")).toEqual([]);
  });

  it("recupera resposta com quebra de linha crua dentro do JSON", () => {
    const raw = '{"resposta": "Abra o Clínicus.\nDepois cole os dados.", "acoes": ["clinicus", "x"]}';
    expect(parseCopilotReply(raw)).toEqual({ reply: "Abra o Clínicus.\nDepois cole os dados.", actions: ["clinicus"] });
  });
});

describe("conversa do Copiloto", () => {
  it("pergunta vinda do guia é enviada uma única vez por nonce", async () => {
    const { claimCopilotAsk } = await import("../copilot");
    expect(claimCopilotAsk(123)).toBe(true);
    expect(claimCopilotAsk(123)).toBe(false);
    expect(claimCopilotAsk(124)).toBe(true);
  });
});
