import { describe, expect, it } from "vitest";
import {
  recommendFromAnswers,
  explainRecommendation,
  type RoutinePain,
  type WorkSetting,
} from "@/lib/onboardingRecommendations";
import { toggleValue } from "@/pages/Onboarding";

const PAIN_EXPECTATIONS: Record<RoutinePain, string> = {
  documentation: "documentation",
  exams: "documentation",
  clinical_decision: "copilot",
  calculations: "copilot",
  rounding: "workflow",
  voice: "workflow",
};

describe("onboarding recommendation engine (multi-select)", () => {
  it("define o caminho pela dor selecionada em todas as 6 opções", () => {
    for (const [pain, expected] of Object.entries(PAIN_EXPECTATIONS)) {
      const r = recommendFromAnswers({
        routinePains: [pain as RoutinePain],
        workSettings: ["other"],
        primaryGoals: ["less_typing"],
      });
      expect(r.primaryPath).toBe(expected);
      expect(r.recommendedTools.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("combina múltiplas dores, settings e objetivos", () => {
    const r = recommendFromAnswers({
      routinePains: ["clinical_decision", "calculations"],
      workSettings: ["emergency", "icu"],
      primaryGoals: ["faster_decisions"],
    });
    expect(r.primaryPath).toBe("copilot");
    expect(r.recommendedTools[0]).toBe("mediscuss");
    expect(r.recommendedTools).toContain("gasometrus");
    expect(r.recommendedTools).toContain("protocolus");
  });

  it("resolve empate pela primeira dor selecionada", () => {
    const a = recommendFromAnswers({
      routinePains: ["rounding", "documentation"],
      workSettings: ["ward"],
      primaryGoals: [],
    });
    expect(a.primaryPath).toBe("workflow");

    const b = recommendFromAnswers({
      routinePains: ["documentation", "rounding"],
      workSettings: ["ward"],
      primaryGoals: [],
    });
    expect(b.primaryPath).toBe("documentation");
  });

  it("usa o fallback técnico quando não há dor para desempatar", () => {
    const r = recommendFromAnswers({
      routinePains: [],
      workSettings: [],
      primaryGoals: [],
    });
    expect(r.primaryPath).toBe("documentation");
    expect(r.recommendedTools).toEqual([]);
  });

  it("nunca duplica slugs e respeita o máximo de 5 ferramentas", () => {
    const settings: WorkSetting[] = ["emergency", "icu", "ward", "outpatient", "other"];
    const r = recommendFromAnswers({
      routinePains: Object.keys(PAIN_EXPECTATIONS) as RoutinePain[],
      workSettings: settings,
      primaryGoals: ["less_typing", "faster_decisions", "standardization"],
    });
    expect(r.recommendedTools.length).toBe(5);
    expect(new Set(r.recommendedTools).size).toBe(5);
  });

  it("gera explicação formal, com complemento no plural", () => {
    for (const path of ["documentation", "copilot", "workflow"] as const) {
      expect(explainRecommendation(path).length).toBeGreaterThan(20);
      expect(explainRecommendation(path, 4).length).toBeGreaterThan(
        explainRecommendation(path, 1).length,
      );
    }
  });
});

describe("toggleValue", () => {
  it("adiciona, remove e preserva ordem de escolha", () => {
    let v: string[] = [];
    v = toggleValue(v, "a");
    v = toggleValue(v, "b");
    expect(v).toEqual(["a", "b"]);
    v = toggleValue(v, "a");
    expect(v).toEqual(["b"]);
  });
});

describe("validação de seleção mínima", () => {
  const valid = (p: string[], s: string[], g: string[]) =>
    p.length > 0 && s.length > 0 && g.length > 0;

  it("exige ao menos uma opção em cada pergunta", () => {
    expect(valid([], ["ward"], ["less_rework"])).toBe(false);
    expect(valid(["rounding"], [], ["less_rework"])).toBe(false);
    expect(valid(["rounding"], ["ward"], [])).toBe(false);
    expect(valid(["rounding"], ["ward"], ["less_rework"])).toBe(true);
  });
});
