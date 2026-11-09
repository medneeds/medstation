import { describe, expect, it } from "vitest";
import { isStudioEnabled, timelineGroup, isStudioModel } from "../studio";

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
});
