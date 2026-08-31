import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ANNUAL_AMOUNT_CENTS,
  ANNUAL_PURPOSE,
  annualPaymentMethodTypes,
  buildAnnualLineItem,
  computeAnnualAccessWindow,
  isAnnualPlan,
  isPixUnavailableError,
  shouldGrantAnnualAccess,
} from "../../../supabase/functions/_shared/annual-purchase";

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, "../../../supabase/functions", rel), "utf8");

describe("plano anual one-time com Pix", () => {
  it("identifica apenas o plano anual", () => {
    expect(isAnnualPlan("pro_completo_yearly")).toBe(true);
    expect(isAnnualPlan("pro_completo")).toBe(false);
  });

  it("monta line item one-time em BRL de R$499,90", () => {
    const item = buildAnnualLineItem(null) as { price_data: Record<string, unknown> };
    expect(item.price_data.currency).toBe("brl");
    expect(item.price_data.unit_amount).toBe(ANNUAL_AMOUNT_CENTS);
    expect(ANNUAL_AMOUNT_CENTS).toBe(49990);
    expect(item.price_data).not.toHaveProperty("recurring");
  });

  it("usa price one-time configurado quando existir", () => {
    expect(buildAnnualLineItem("price_one_time_123")).toEqual({ price: "price_one_time_123", quantity: 1 });
  });

  it("aceita cartão e Pix no anual e só cartão no fallback", () => {
    expect(annualPaymentMethodTypes(true)).toEqual(["card", "pix"]);
    expect(annualPaymentMethodTypes(false)).toEqual(["card"]);
  });

  it("detecta indisponibilidade de Pix na conta", () => {
    expect(isPixUnavailableError("The payment method type `pix` is invalid")).toBe(true);
    expect(isPixUnavailableError("Your card was declined")).toBe(false);
  });

  it("mensal permanece assinatura e anual vira pagamento único", () => {
    for (const file of ["create-checkout/index.ts", "guest-checkout/index.ts"]) {
      const src = read(file);
      expect(src).toContain('mode: "subscription"');
      expect(src).toContain('mode: "payment"');
      expect(src).toContain("isAnnualPlan(plan)");
      expect(src).toContain('currency: "brl"');
    }
  });
});

describe("concessão de acesso anual", () => {
  const session = (over: Record<string, unknown> = {}) => ({
    id: "cs_1",
    mode: "payment",
    payment_status: "unpaid",
    metadata: { purpose: ANNUAL_PURPOSE },
    ...over,
  });

  it("não concede em completed sem pagamento (Pix pendente)", () => {
    expect(shouldGrantAnnualAccess("checkout.session.completed", session())).toBe(false);
  });

  it("concede em completed pago (cartão)", () => {
    expect(
      shouldGrantAnnualAccess("checkout.session.completed", session({ payment_status: "paid" })),
    ).toBe(true);
  });

  it("concede em async_payment_succeeded (Pix)", () => {
    expect(shouldGrantAnnualAccess("checkout.session.async_payment_succeeded", session())).toBe(true);
  });

  it("não concede em falha assíncrona nem em sessões de assinatura", () => {
    expect(shouldGrantAnnualAccess("checkout.session.async_payment_failed", session())).toBe(false);
    expect(shouldGrantAnnualAccess("checkout.session.completed", session({ mode: "subscription", payment_status: "paid" }))).toBe(false);
  });

  it("concede 12 meses a partir do pagamento", () => {
    const { accessStart, accessEnd } = computeAnnualAccessWindow(new Date("2026-01-10T00:00:00Z"), null);
    expect(accessStart).toBe("2026-01-10T00:00:00.000Z");
    expect(accessEnd).toBe("2027-01-10T00:00:00.000Z");
  });

  it("nova compra futura estende a partir do fim do acesso vigente", () => {
    const { accessEnd } = computeAnnualAccessWindow(
      new Date("2026-06-01T00:00:00Z"),
      "2027-01-10T00:00:00.000Z",
    );
    expect(accessEnd).toBe("2028-01-10T00:00:00.000Z");
  });

  it("reentrega do mesmo pagamento é bloqueada por chave única da sessão", () => {
    const webhook = read("stripe-webhook/index.ts");
    expect(webhook).toContain('.eq("checkout_session_id", session.id)');
    expect(webhook).toContain('return { granted: false, reason: "already_processed" }');
    expect(webhook).toContain('error.code === "23505"');
  });

  it("MRR continua vindo só de assinaturas, sem a compra anual one-time", () => {
    const billing = read("admin-list-subscribers/index.ts");
    expect(billing).not.toContain("stripe_one_time_purchases");
  });
});
