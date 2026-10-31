import { describe, expect, it } from "vitest";
import * as server from "../../../supabase/functions/_shared/pricing-schedule";
import * as site from "../pricingSchedule";
import {
  BLACK_ANNUAL_PLAN_SLUG,
  isOfferedOneTimePlan,
  planExcludesArsenalBonus,
  resolveOneTimePlan,
} from "../../../supabase/functions/_shared/one-time-purchase";
import { purchaseEligibility } from "../../../supabase/functions/_shared/arsenal-bonus";

// Horário de Brasília = UTC-3.
const OCT_31_2359_BRT = new Date("2026-11-01T02:59:00.000Z");
const NOV_01_0000_BRT = new Date("2026-11-01T03:00:00.000Z");
const NOV_30_2359_BRT = new Date("2026-12-01T02:59:00.000Z");
const DEC_01_0000_BRT = new Date("2026-12-01T03:00:00.000Z");

describe("Black MedStation (novembro/2026)", () => {
  it("site e servidor usam o mesmo calendário e os mesmos valores", () => {
    expect(site.BLACK_OFFER).toEqual(server.BLACK_OFFER);
    expect(site.PRICE_TABLE).toEqual(server.PRICE_TABLE);
    expect(site.FULL_PRICE_STARTS_AT).toBe(server.FULL_PRICE_STARTS_AT);
  });

  it("vale de 1º de novembro 00h até 30 de novembro 23h59 (Brasília)", () => {
    expect(server.blackStatus(OCT_31_2359_BRT)).toBe("upcoming");
    expect(server.blackStatus(NOV_01_0000_BRT)).toBe("active");
    expect(server.blackStatus(NOV_30_2359_BRT)).toBe("active");
    expect(server.blackStatus(DEC_01_0000_BRT)).toBe("ended");
  });

  it("custa R$ 399,90 e só é vendida dentro da janela", () => {
    expect(resolveOneTimePlan(BLACK_ANNUAL_PLAN_SLUG, NOV_01_0000_BRT)?.amountCents).toBe(39990);
    expect(isOfferedOneTimePlan(BLACK_ANNUAL_PLAN_SLUG, OCT_31_2359_BRT)).toBe(false);
    expect(isOfferedOneTimePlan(BLACK_ANNUAL_PLAN_SLUG, NOV_30_2359_BRT)).toBe(true);
    expect(isOfferedOneTimePlan(BLACK_ANNUAL_PLAN_SLUG, DEC_01_0000_BRT)).toBe(false);
  });

  it("é um plano anual de 12 meses", () => {
    const plan = resolveOneTimePlan(BLACK_ANNUAL_PLAN_SLUG, NOV_01_0000_BRT);
    expect(plan?.accessPeriod).toBe("annual_12m");
    expect(plan?.paymentMethodTypes).toEqual(["card", "boleto"]);
  });

  it("não dá direito ao bônus Arsenal Med", () => {
    expect(planExcludesArsenalBonus(BLACK_ANNUAL_PLAN_SLUG)).toBe(true);
    expect(planExcludesArsenalBonus("pro_completo_yearly")).toBe(false);
    const row = {
      email: "medico@example.com",
      status: "paid",
      access_period: "annual_12m",
      access_end: "2027-11-15T00:00:00.000Z",
    };
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    expect(purchaseEligibility({ ...row, plan: BLACK_ANNUAL_PLAN_SLUG }, now)).toEqual({ eligible: false });
    expect(purchaseEligibility({ ...row, plan: "pro_completo_yearly" }, now).eligible).toBe(true);
  });
});

describe("Preço depois da Black (a partir de 1º/12/2026)", () => {
  it("anual passa de R$ 499,90 para R$ 999,90", () => {
    expect(resolveOneTimePlan("pro_completo_yearly", NOV_30_2359_BRT)?.amountCents).toBe(49990);
    expect(resolveOneTimePlan("pro_completo_yearly", DEC_01_0000_BRT)?.amountCents).toBe(99990);
  });

  it("anual de dezembro ignora o Price fixo de R$ 499,90", () => {
    expect(resolveOneTimePlan("pro_completo_yearly", NOV_30_2359_BRT)?.priceEnvVar).not.toBe("");
    expect(resolveOneTimePlan("pro_completo_yearly", DEC_01_0000_BRT)?.priceEnvVar).toBe("");
  });

  it("mensal passa de R$ 49,90 para R$ 99,90", () => {
    expect(server.monthlySubscriptionLineItem("price_launch", NOV_30_2359_BRT)).toEqual({
      price: "price_launch",
      quantity: 1,
    });
    const december = server.monthlySubscriptionLineItem("price_launch", DEC_01_0000_BRT);
    expect("price_data" in december && december.price_data.unit_amount).toBe(9990);
    expect("price_data" in december && december.price_data.recurring.interval).toBe("month");
  });
});
