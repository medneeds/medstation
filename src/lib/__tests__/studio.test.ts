import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { isStudioEnabled, timelineGroup, isStudioModel, timelineThreads, legacyThreadsToImport, type StudioThread } from "../studio";

const thread = (id: string, updatedAt: number, n: number): StudioThread => ({
  id, title: id, model: "openai/gpt-6-astra" as StudioThread["model"], updatedAt,
  messages: Array.from({ length: n }, () => ({ role: "user" as const, content: "oi" })),
});

describe("MedStation Studio", () => {
  it("fica desligado por padrão", () => {
    expect(isStudioEnabled(null)).toBe(false);
    expect(isStudioEnabled("0")).toBe(false);
    expect(isStudioEnabled("1")).toBe(true);
  });
  it("aceita só os modelos oferecidos", () => {
    expect(isStudioModel("openai/gpt-6-astra")).toBe(true);
    expect(isStudioModel("openai/gpt-4")).toBe(false);
  });
  it("agrupa a linha do tempo", () => {
    const now = new Date(2026, 10, 9, 15).getTime();
    expect(timelineGroup(now - 3600000, now)).toBe("Hoje");
    expect(timelineGroup(now - 86400000, now)).toBe("Ontem");
    expect(timelineGroup(now - 3 * 86400000, now)).toBe("Últimos 7 dias");
    expect(timelineGroup(now - 30 * 86400000, now)).toBe("Anteriores");
  });
  it("linha do tempo mostra só conversas com mensagem, a mais recente primeiro", () => {
    const list = timelineThreads([thread("a", 1, 2), thread("vazia", 9, 0), thread("b", 5, 1)]);
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
  });
  it("leva para a conta só conversas antigas válidas e com mensagem", () => {
    const ok = "3f2b9c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
    const out = legacyThreadsToImport([
      thread(ok, 1, 1),
      thread("6b1c2d3e-4f50-4a61-8b72-93a4b5c6d7e8", 1, 0),
      thread("sem-uuid", 1, 3),
    ]);
    expect(out.map((t) => t.id)).toEqual([ok]);
    expect(legacyThreadsToImport("lixo")).toEqual([]);
  });
});
