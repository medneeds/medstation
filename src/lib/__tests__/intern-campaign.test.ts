import { describe, it, expect } from "vitest";
import { INTERN_CAMPAIGN, isGuaranteedSpot, graduationYearOptions } from "@/lib/internCampaign";

describe("campanha de internos", () => {
  it("libera 30 vagas por 30 dias", () => {
    expect(INTERN_CAMPAIGN.spots).toBe(30);
    expect(INTERN_CAMPAIGN.courtesyDays).toBe(30);
  });
  it("30º garante vaga, 31º vai para lista de espera", () => {
    expect(isGuaranteedSpot(1)).toBe(true);
    expect(isGuaranteedSpot(30)).toBe(true);
    expect(isGuaranteedSpot(31)).toBe(false);
  });
  it("anos de formatura oferecidos cabem no limite do cadastro de interno (até +10 anos)", () => {
    const opts = graduationYearOptions(new Date("2026-10-21T12:00:00Z"));
    expect(opts[0]).toBe(2026);
    expect(Math.max(...opts)).toBeLessThanOrEqual(2026 + 10);
  });
});
