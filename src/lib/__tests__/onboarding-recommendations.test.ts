import { describe, expect, it } from "vitest";
import {
  recommendFromAnswers,
  explainRecommendation,
  type RoutinePain,
  type WorkSetting,
} from "@/lib/onboardingRecommendations";

const PAIN_EXPECTATIONS: Record<RoutinePain, string> = {
  documentation: "documentation",
  exams: "documentation",
  clinical_decision: "copilot",
  calculations: "copilot",
  rounding: "workflow",
  voice: "workflow",
};

describe("onboarding recommendation engine", () => {
  it("define o caminho pela dor principal em todas as 6 opções", () => {
    for (const [pain, expected] of Object.entries(PAIN_EXPECTATIONS)) {
      const r = recommendFromAnswers({
        routinePain: pain as RoutinePain,
        workSetting: "other",
        primaryGoal: "less_typing",
      });
      expect(r.primaryPath).toBe(expected);
      expect(r.recommendedTools.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("prioriza ferramentas conforme o local de atuação", () => {
    const emergency = recommendFromAnswers({
      routinePain: "clinical_decision",
      workSetting: "emergency",
      primaryGoal: "faster_decisions",
    });
    expect(emergency.recommendedTools[0]).toBe("protocolus");

    const outpatient = recommendFromAnswers({
      routinePain: "documentation",
      workSetting: "outpatient",
      primaryGoal: "less_typing",
    });
    expect(outpatient.recommendedTools[0]).toBe("clinicus");
    expect(outpatient.recommendedTools).toContain("modo_escuta");

    const icu = recommendFromAnswers({
      routinePain: "calculations",
      workSetting: "icu",
      primaryGoal: "organized_workflow",
    });
    expect(icu.recommendedTools[0]).toBe("gasometrus");
    expect(icu.recommendedTools).toContain("modo_rotineiro");

    const ward = recommendFromAnswers({
      routinePain: "rounding",
      workSetting: "ward",
      primaryGoal: "less_rework",
    });
    expect(ward.recommendedTools[0]).toBe("modo_rotineiro");
  });

  it("nunca duplica slugs e respeita o máximo de 5 ferramentas", () => {
    const settings: WorkSetting[] = ["emergency", "icu", "ward", "outpatient", "other"];
    for (const pain of Object.keys(PAIN_EXPECTATIONS) as RoutinePain[]) {
      for (const setting of settings) {
        const r = recommendFromAnswers({
          routinePain: pain,
          workSetting: setting,
          primaryGoal: "less_rework",
        });
        expect(r.recommendedTools.length).toBeLessThanOrEqual(5);
        expect(new Set(r.recommendedTools).size).toBe(r.recommendedTools.length);
      }
    }
  });

  it("o objetivo não sobrepõe a dor principal", () => {
    const r = recommendFromAnswers({
      routinePain: "documentation",
      workSetting: "other",
      primaryGoal: "faster_decisions",
    });
    expect(r.primaryPath).toBe("documentation");
  });

  it("gera explicação formal para cada caminho", () => {
    for (const path of ["documentation", "copilot", "workflow"] as const) {
      expect(explainRecommendation(path).length).toBeGreaterThan(20);
    }
  });
});
