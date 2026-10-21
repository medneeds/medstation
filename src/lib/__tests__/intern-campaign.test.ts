import { describe, it, expect } from "vitest";
import { INTERN_CAMPAIGN, isGuaranteedSpot, graduationYearOptions } from "@/lib/internCampaign";
import { planInternCourtesy as planRule } from "../../../supabase/functions/admin-grant-intern-courtesy/plan";
const planInternCourtesy = (e: { expires_at: string | null } | null, now: Date) => planRule(e, INTERN_CAMPAIGN.courtesyDays, now);

describe("liberação da cortesia de internos", () => {
  const now = new Date("2026-10-21T17:00:00Z");
  const in30 = "2026-11-20T17:00:00.000Z";
  it("sem cortesia anterior: cria 30 dias", () => {
    expect(planInternCourtesy(null, now)).toEqual({ action: "insert", expiresAt: in30 });
  });
  it("teste antigo já vencido: atualiza para 30 dias a partir de hoje", () => {
    expect(planInternCourtesy({ expires_at: "2026-08-18T21:12:58Z" }, now)).toEqual({ action: "update", expiresAt: in30 });
  });
  it("teste de 7 dias ainda ativo: estende para 30 dias", () => {
    expect(planInternCourtesy({ expires_at: "2026-10-28T17:18:59Z" }, now)).toEqual({ action: "update", expiresAt: in30 });
  });
  it("acesso maior que 30 dias ou sem prazo: não encurta", () => {
    expect(planInternCourtesy({ expires_at: "2027-01-01T00:00:00Z" }, now).action).toBe("keep");
    expect(planInternCourtesy({ expires_at: null }, now).action).toBe("keep");
  });
});

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
