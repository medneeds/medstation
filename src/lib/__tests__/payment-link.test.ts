import { describe, expect, it } from "vitest";
import {
  collectCustomerIds,
  paymentLinkIssue,
} from "../../../supabase/functions/_shared/payment-link";

describe("ligação pagamento ↔ conta", () => {
  it("consulta também a assinatura ligada à conta, mesmo com e-mail diferente no pagamento", () => {
    // Conta com Gmail sem cliente no Stripe; assinatura ligada pela conta.
    expect(collectCustomerIds([], ["cus_daiane"])).toEqual(["cus_daiane"]);
  });

  it("não repete o mesmo cliente achado pelo e-mail e pelo vínculo", () => {
    expect(collectCustomerIds(["cus_a", "cus_b"], ["cus_b", null, ""])).toEqual(["cus_a", "cus_b"]);
  });

  it("pagamento ativo sem conta ligada é sinalizado", () => {
    expect(paymentLinkIssue({ userId: null, accountEmail: null, paymentEmail: "a@x.com" })).toBe("sem_conta");
  });

  it("pagamento ligado a conta apagada é sinalizado", () => {
    expect(paymentLinkIssue({ userId: "u1", accountEmail: null, paymentEmail: "a@x.com" })).toBe("conta_inexistente");
  });

  it("e-mail da conta diferente do pagamento é sinalizado (caso 41)", () => {
    expect(
      paymentLinkIssue({
        userId: "u1",
        accountEmail: "daianealvescs@gmail.com",
        paymentEmail: "daianealvescs41@gmail.com",
      }),
    ).toBe("email_diferente");
  });

  it("mesmo e-mail com maiúsculas/espaços não é problema", () => {
    expect(
      paymentLinkIssue({ userId: "u1", accountEmail: "Ana@Gmail.com ", paymentEmail: "ana@gmail.com" }),
    ).toBeNull();
  });
});
