import { describe, expect, it } from "vitest";
import {
  oneTimeMonthlyCents,
  summarizeOneTime,
  type OneTimePurchaseRow,
} from "../../../supabase/functions/admin-list-subscribers/one-time";

const NOW = new Date("2026-10-23T12:00:00Z").getTime();

const annual = (over: Partial<OneTimePurchaseRow> = {}): OneTimePurchaseRow => ({
  user_id: "u1",
  email: "medico@exemplo.com",
  stripe_customer_id: "cus_1",
  amount_cents: 49990,
  currency: "brl",
  access_period: "annual_12m",
  paid_at: "2026-10-21T13:29:54Z",
  access_end: "2027-10-21T13:29:54Z",
  ...over,
});

describe("plano anual de pagamento único no painel", () => {
  it("anual de R$ 499,90 entra na receita mensal dividido por 12", () => {
    expect(oneTimeMonthlyCents(annual())).toBe(4166);
  });

  it("Pix 30 dias entra na receita mensal pelo valor inteiro", () => {
    expect(oneTimeMonthlyCents({ amount_cents: 5990, access_period: "monthly_30d" })).toBe(5990);
  });

  it("anual vigente é contado como assinante anual", () => {
    const s = summarizeOneTime([annual()], NOW);
    expect(s?.interval).toBe("year");
    expect(s?.monthlyAmountCents).toBe(4166);
    expect(s?.endDate).toBe("2027-10-21T13:29:54Z");
  });

  it("anual já vencido não conta como pagante", () => {
    expect(summarizeOneTime([annual({ access_end: "2026-10-01T00:00:00Z" })], NOW)).toBeNull();
  });
});
