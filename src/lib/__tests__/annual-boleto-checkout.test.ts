import { describe, expect, it } from "vitest";
import {
  BOLETO_EXPIRES_AFTER_DAYS,
  getOneTimePlan,
  isAsyncMethodUnavailableError,
  isOfferedOneTimePlan,
  normalizePaymentMethod,
  oneTimePaymentMethodOptions,
  oneTimePaymentMethodTypes,
  shouldGrantOneTimeAccess,
  ANNUAL_PURPOSE,
} from "../../../supabase/functions/_shared/one-time-purchase";
import { messageForCheckoutError } from "../checkoutErrors";

describe("Pix retirado das opções de pagamento", () => {
  it("o Pix mensal não é mais vendido", () => {
    expect(isOfferedOneTimePlan("pix_monthly_30d")).toBe(false);
  });

  it("o anual continua à venda e não aceita Pix", () => {
    expect(isOfferedOneTimePlan("pro_completo_yearly")).toBe(true);
    const annual = getOneTimePlan("pro_completo_yearly")!;
    expect(oneTimePaymentMethodTypes(annual, true)).not.toContain("pix");
  });

  it("explica ao médico que o Pix saiu", () => {
    expect(messageForCheckoutError({ code: "PAYMENT_OPTION_RETIRED", message: "" })).toContain("boleto");
  });
});

describe("anual via boleto", () => {
  const annual = getOneTimePlan("pro_completo_yearly")!;

  it("oferece boleto no anual com vencimento de 3 dias", () => {
    expect(oneTimePaymentMethodTypes(annual, true)).toEqual(["card", "boleto"]);
    expect(BOLETO_EXPIRES_AFTER_DAYS).toBe(3);
    expect(oneTimePaymentMethodOptions(["card", "boleto"])).toEqual({
      card: { installments: { enabled: true } },
      boleto: { expires_after_days: 3 },
    });
    expect(oneTimePaymentMethodOptions(["card"])).toEqual({ card: { installments: { enabled: true } } });
    expect(oneTimePaymentMethodOptions(["boleto"])).toEqual({ boleto: { expires_after_days: 3 } });
  });

  it("boleto não ativado na conta cai para cartão", () => {
    expect(isAsyncMethodUnavailableError("The payment method type `boleto` is invalid.")).toBe(true);
    expect(oneTimePaymentMethodTypes(annual, false)).toEqual(["card"]);
    expect(isAsyncMethodUnavailableError("Your card was declined")).toBe(false);
  });

  it("boleto gerado não libera acesso; compensado libera", () => {
    const session = { id: "cs_b", mode: "payment", payment_status: "unpaid", metadata: { purpose: ANNUAL_PURPOSE } };
    expect(shouldGrantOneTimeAccess("checkout.session.completed", session)).toBe(false);
    expect(shouldGrantOneTimeAccess("checkout.session.async_payment_succeeded", session)).toBe(true);
    expect(shouldGrantOneTimeAccess("checkout.session.async_payment_failed", session)).toBe(false);
  });

  it("registra a forma de pagamento como boleto", () => {
    expect(normalizePaymentMethod(["boleto"])).toBe("boleto");
  });
});
