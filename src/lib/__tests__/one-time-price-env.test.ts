import { describe, expect, it } from "vitest";
import {
  getOneTimePlan,
  oneTimePriceIdFromEnv,
} from "../../../supabase/functions/_shared/one-time-purchase";

const throwingEnv = (key: string) => {
  if (key === "") throw new Error("Key is an empty string.");
  return key === "STRIPE_ANNUAL_ONETIME_PRICE_ID" ? "price_annual" : undefined;
};

describe("price do checkout avulso", () => {
  it("Pix mensal não consulta o ambiente com chave vazia", () => {
    const plan = getOneTimePlan("pix_monthly_30d")!;
    expect(oneTimePriceIdFromEnv(plan, throwingEnv)).toBeNull();
  });

  it("anual continua lendo o Price dedicado", () => {
    const plan = getOneTimePlan("pro_completo_yearly")!;
    expect(oneTimePriceIdFromEnv(plan, throwingEnv)).toBe("price_annual");
  });
});
