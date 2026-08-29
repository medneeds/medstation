import { describe, expect, it } from "vitest";
import {
  checkoutConversion,
  normalizeMonthlyCents,
  normalizeToolSlug,
  percentile,
  safeRate,
  sourceState,
  summarizeRetention,
  summarizeTimeToValue,
} from "@/lib/adminMetrics";

describe("normalizeToolSlug", () => {
  it("prefere o assistente real quando disponível", () => {
    expect(normalizeToolSlug("Examinus", "agent-chat")).toBe("examinus");
  });

  it("descarta o slug genérico clinical_assistant e usa a função", () => {
    expect(normalizeToolSlug("clinical_assistant", "examinus-chat")).toBe("examinus");
  });

  it("cai para a função quando não há assistente", () => {
    expect(normalizeToolSlug(null, "consultation-transcribe")).toBe("consultorio");
  });

  it("nunca devolve string vazia", () => {
    expect(normalizeToolSlug(null, null)).toBe("não identificado");
    expect(normalizeToolSlug("", "")).toBe("não identificado");
  });
});

describe("percentile", () => {
  it("devolve null para lista vazia", () => {
    expect(percentile([], 0.5)).toBeNull();
  });

  it("calcula mediana e p90 com interpolação", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([10], 0.9)).toBe(10);
  });
});

describe("summarizeTimeToValue", () => {
  it("resume percentis e faixa de 10 minutos", () => {
    const out = summarizeTimeToValue([1, 2, 5, 30, 120]);
    expect(out.users).toBe(5);
    expect(out.medianMinutes).toBe(5);
    expect(out.under10Minutes).toBe(3);
    expect(out.under10Percent).toBe(60);
  });

  it("ignora valores inválidos e negativos", () => {
    const out = summarizeTimeToValue([NaN, -5, 4]);
    expect(out.users).toBe(1);
    expect(out.medianMinutes).toBe(4);
  });

  it("sem usuários devolve null em vez de zero falso", () => {
    const out = summarizeTimeToValue([]);
    expect(out.users).toBe(0);
    expect(out.medianMinutes).toBeNull();
    expect(out.under10Percent).toBeNull();
  });
});

describe("checkoutConversion / safeRate", () => {
  it("usa checkouts iniciados como denominador", () => {
    expect(checkoutConversion(3, 12)).toBe(25);
  });

  it("denominador zero devolve null e não 0%", () => {
    expect(checkoutConversion(0, 0)).toBeNull();
    expect(safeRate(5, 0)).toBeNull();
  });
});

describe("summarizeRetention", () => {
  it("conta dias distintos por usuário", () => {
    const map = new Map<string, Set<string>>([
      ["a", new Set(["2026-08-01", "2026-08-02", "2026-08-03"])],
      ["b", new Set(["2026-08-01", "2026-08-01"])],
      ["c", new Set(["1", "2", "3", "4", "5", "6", "7"])],
    ]);
    const out = summarizeRetention(map);
    expect(out.usersWithActivity).toBe(3);
    expect(out.twoPlusDays).toBe(2);
    expect(out.threePlusDays).toBe(2);
    expect(out.sevenPlusDays).toBe(1);
  });
});

describe("normalizeMonthlyCents", () => {
  it("normaliza plano anual dividindo por 12", () => {
    expect(normalizeMonthlyCents(49990, "year")).toBe(4166);
  });

  it("mantém plano mensal", () => {
    expect(normalizeMonthlyCents(4990, "month")).toBe(4990);
  });

  it("respeita interval_count e quantidade", () => {
    expect(normalizeMonthlyCents(12000, "month", 6)).toBe(2000);
    expect(normalizeMonthlyCents(4990, "month", 1, 2)).toBe(9980);
  });

  it("valores ausentes viram zero", () => {
    expect(normalizeMonthlyCents(null, "year")).toBe(0);
  });
});

describe("sourceState", () => {
  it("distingue fonte indisponível de zero real", () => {
    expect(sourceState(null)).toBe("unavailable");
    expect(sourceState(undefined)).toBe("unavailable");
    expect(sourceState([])).toBe("empty");
    expect(sourceState([1])).toBe("ok");
  });
});
