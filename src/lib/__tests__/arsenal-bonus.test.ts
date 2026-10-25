import { describe, expect, it, vi } from "vitest";
import {
  ARSENAL_BONUS_ENDPOINT,
  isBonusReference,
  notifyArsenalBonus,
  purchaseEligibility,
  subscriptionEligibility,
} from "../../../supabase/functions/_shared/arsenal-bonus";

const NOW = new Date("2026-10-25T12:00:00Z").getTime();
const NEXT_YEAR = "2027-10-25T10:58:12.903Z";

const annual = (over = {}) => ({
  email: "Medico@Exemplo.com",
  status: "paid",
  access_period: "annual_12m",
  access_end: NEXT_YEAR,
  ...over,
});

describe("bônus Arsenal Med", () => {
  it("compra anual paga libera o bônus pelos 12 meses do plano", () => {
    expect(purchaseEligibility(annual(), NOW)).toEqual({
      eligible: true,
      email: "medico@exemplo.com",
      access_until: NEXT_YEAR,
    });
  });

  it("compra mensal (30 dias) não dá direito ao bônus", () => {
    expect(purchaseEligibility(annual({ access_period: "monthly_30d" }), NOW).eligible).toBe(false);
  });

  it("boleto ainda não pago não libera o bônus", () => {
    expect(purchaseEligibility(annual({ status: "pending" }), NOW).eligible).toBe(false);
  });

  it("plano anual vencido não libera o bônus", () => {
    expect(purchaseEligibility(annual({ access_end: "2026-10-01T00:00:00Z" }), NOW).eligible).toBe(false);
  });

  it("assinatura anual ativa libera; mensal não", () => {
    const sub = { status: "active", billing_interval: "year", current_period_end: NEXT_YEAR };
    expect(subscriptionEligibility(sub, "a@b.com", NOW).eligible).toBe(true);
    expect(subscriptionEligibility({ ...sub, billing_interval: "month" }, "a@b.com", NOW).eligible).toBe(false);
    expect(subscriptionEligibility({ ...sub, status: "canceled" }, "a@b.com", NOW).eligible).toBe(false);
  });

  it("só aceita referências reais de checkout ou assinatura", () => {
    expect(isBonusReference("cs_live_a1MmqcIy2HhgHCxq2NI70PNq")).toBe(true);
    expect(isBonusReference("sub_1AbCdEfGhIjKlMn")).toBe(true);
    expect(isBonusReference("medico@exemplo.com")).toBe(false);
    expect(isBonusReference("cs_live_' or 1=1")).toBe(false);
  });

  it("avisa o Arsenal Med e nunca lança erro quando ele está fora do ar", async () => {
    const ok = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await notifyArsenalBonus("cs_live_a1MmqcIy2HhgHCxq2NI70PNq", ok)).toBe(true);
    expect(ok).toHaveBeenCalledWith(ARSENAL_BONUS_ENDPOINT, expect.objectContaining({ method: "POST" }));

    const down = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await notifyArsenalBonus("cs_live_a1MmqcIy2HhgHCxq2NI70PNq", down)).toBe(false);
  });
});
