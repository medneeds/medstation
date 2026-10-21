import { describe, it, expect } from "vitest";
import { INTERN_CAMPAIGN, isGuaranteedSpot } from "@/lib/internCampaign";

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
});
