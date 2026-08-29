import { describe, expect, it } from "vitest";
import { aggregateOnboarding, type OnboardingRow } from "@/lib/onboardingInsights";

const row = (r: Partial<OnboardingRow>): OnboardingRow => ({
  completed_at: "2026-08-01T00:00:00Z",
  routine_pains: [],
  work_settings: [],
  primary_goals: [],
  primary_path: null,
  recommended_tools: [],
  ...r,
});

describe("aggregateOnboarding", () => {
  it("conta múltipla escolha usando respondentes como denominador", () => {
    const rows = [
      row({
        routine_pains: ["documentation", "exams"],
        work_settings: ["ward"],
        primary_goals: ["less_typing"],
        primary_path: "documentation",
        recommended_tools: ["clinicus", "examinus"],
      }),
      row({
        routine_pains: ["documentation"],
        work_settings: ["icu"],
        primary_goals: ["less_typing", "less_rework"],
        primary_path: "copilot",
        recommended_tools: ["clinicus", "gasometrus"],
      }),
    ];
    const out = aggregateOnboarding(rows);
    expect(out.surveyRespondents).toBe(2);
    expect(out.routinePains.find((i) => i.key === "documentation")).toEqual({
      key: "documentation",
      count: 2,
      percent: 100,
    });
    expect(out.routinePains.find((i) => i.key === "exams")?.percent).toBe(50);
    // Percentuais podem ultrapassar 100% somados.
    expect(out.routinePains.reduce((a, i) => a + i.percent, 0)).toBeGreaterThan(100);
    expect(out.primaryPaths.map((p) => p.key).sort()).toEqual(["copilot", "documentation"]);
    expect(out.recommendedTools[0]).toEqual({ key: "clinicus", count: 2, percent: 100 });
  });

  it("não contamina distribuições com linhas legado sem respostas", () => {
    const rows = [
      row({ routine_pains: ["voice"], work_settings: ["outpatient"], primary_goals: ["less_typing"] }),
      row({}),
      row({}),
    ];
    const out = aggregateOnboarding(rows);
    expect(out.completedTotal).toBe(3);
    expect(out.surveyRespondents).toBe(1);
    expect(out.legacyCompletedWithoutSurvey).toBe(2);
    expect(out.routinePains).toEqual([{ key: "voice", count: 1, percent: 100 }]);
  });

  it("calcula taxa de conclusão e limita o top de ferramentas a 5", () => {
    const rows = [
      row({
        routine_pains: ["documentation"],
        recommended_tools: ["a", "b", "c", "d", "e", "f"],
      }),
      row({ completed_at: null }),
    ];
    const out = aggregateOnboarding(rows);
    expect(out.completedTotal).toBe(1);
    expect(out.pendingTotal).toBe(1);
    expect(out.completionPercent).toBe(50);
    expect(out.recommendedTools.length).toBe(5);
  });

  it("suporta base vazia sem erro", () => {
    const out = aggregateOnboarding([]);
    expect(out.surveyRespondents).toBe(0);
    expect(out.routinePains).toEqual([]);
    expect(out.completionPercent).toBeNull();
  });
});
