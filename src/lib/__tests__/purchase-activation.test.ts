import { describe, expect, it } from "vitest";
import {
  PURCHASE_ACTIVATION_SUBJECT,
  checkoutAccountDecision,
  checkoutAccountFields,
  paymentPlanOf,
  purchaseActivationRedirect,
  purchasedPlanSummary,
  resendSecondsLeft,
  shouldUsePurchaseActivationEmail,
  urlHasPurchaseActivationMarker,
} from "../../../supabase/functions/_shared/purchase-activation";
import { isOnboardingProfileValid } from "@/pages/Onboarding";

const invitedByPayment = {
  id: "u1",
  email: "medico@x.com",
  invited_at: "2026-11-01T10:00:00Z",
  email_confirmed_at: null,
  last_sign_in_at: null,
  user_metadata: { payment_account_setup: true, payment_plan: "black_anual_2026" },
};

describe("complete-checkout: decisão da conta depois do pagamento", () => {
  it("sem conta: o complete-checkout precisa convidar", () => {
    expect(checkoutAccountDecision(null)).toEqual({ kind: "no_account" });
  });

  it("convidado pelo webhook e nunca entrou: ativação por e-mail, nunca login com senha", () => {
    const decision = checkoutAccountDecision(invitedByPayment);
    expect(decision).toEqual({ kind: "activation_pending", accessEmailSent: true });
    const fields = checkoutAccountFields("activation_pending", true);
    expect(fields.needsActivation).toBe(true);
    expect(fields.accessEmailSent).toBe(true);
    // Clientes antigos da /obrigado leem userExists/passwordWasSkipped.
    expect(fields.userExists).toBe(false);
    expect(fields.passwordWasSkipped).toBe(true);
  });

  it("conta antiga nunca ativada, sem convite de pagamento: não diz que o e-mail foi enviado", () => {
    expect(checkoutAccountDecision({ id: "u2", user_metadata: {} })).toEqual({
      kind: "activation_pending",
      accessEmailSent: false,
    });
  });

  it("quem já entrou alguma vez ou confirmou o e-mail segue para o login", () => {
    expect(checkoutAccountDecision({ ...invitedByPayment, last_sign_in_at: "2026-11-01T11:00:00Z" }).kind)
      .toBe("existing_user");
    expect(checkoutAccountDecision({ ...invitedByPayment, email_confirmed_at: "2026-11-01T11:00:00Z" }).kind)
      .toBe("existing_user");
    const fields = checkoutAccountFields("existing_user");
    expect(fields).toMatchObject({ userExists: true, needsActivation: false, passwordWasSkipped: false });
  });

  it("convite enviado agora e convite que falhou", () => {
    expect(checkoutAccountFields("invite_sent")).toMatchObject({ needsActivation: true, accessEmailSent: true });
    expect(checkoutAccountFields("invite_failed")).toMatchObject({ needsActivation: true, accessEmailSent: false });
  });
});

describe("auth-email-hook: e-mail de compra", () => {
  const verifyUrl = (redirect: string) =>
    `https://proj.supabase.co/auth/v1/verify?token=abc&type=signup&redirect_to=${encodeURIComponent(redirect)}`;

  it("o convite de quem pagou vira o e-mail de compra", () => {
    expect(shouldUsePurchaseActivationEmail({ actionType: "invite", url: verifyUrl("https://medstation-ai.com.br/onboarding"), user: invitedByPayment }))
      .toBe(true);
    expect(PURCHASE_ACTIVATION_SUBJECT).toBe("Pagamento confirmado: ative seu acesso à MedStation");
  });

  it("convite que não veio de pagamento (cortesia, admin) segue genérico", () => {
    expect(shouldUsePurchaseActivationEmail({ actionType: "invite", url: "x", user: { id: "u", user_metadata: {} } }))
      .toBe(false);
  });

  it("o reenvio da /obrigado (com a marca no redirect) também usa o e-mail de compra", () => {
    const url = verifyUrl(purchaseActivationRedirect("https://medstation-ai.com.br/"));
    expect(urlHasPurchaseActivationMarker(url)).toBe(true);
    expect(shouldUsePurchaseActivationEmail({ actionType: "signup", url, user: invitedByPayment })).toBe(true);
    expect(shouldUsePurchaseActivationEmail({ actionType: "magiclink", url, user: invitedByPayment })).toBe(true);
  });

  it("login comum por link não vira e-mail de compra", () => {
    const url = verifyUrl("https://medstation-ai.com.br/auth?confirmed=1");
    expect(shouldUsePurchaseActivationEmail({ actionType: "magiclink", url, user: invitedByPayment })).toBe(false);
  });

  it("a marca sozinha não basta: quem não pagou ou já ativou recebe o e-mail padrão", () => {
    const url = verifyUrl(purchaseActivationRedirect("https://medstation-ai.com.br"));
    expect(shouldUsePurchaseActivationEmail({ actionType: "signup", url, user: { id: "u", user_metadata: {} } })).toBe(false);
    expect(shouldUsePurchaseActivationEmail({
      actionType: "signup",
      url,
      user: { ...invitedByPayment, last_sign_in_at: "2026-11-02T00:00:00Z" },
    })).toBe(false);
    expect(shouldUsePurchaseActivationEmail({ actionType: "recovery", url, user: invitedByPayment })).toBe(false);
  });

  it("resumo da Black é exato e plano desconhecido não inventa detalhes", () => {
    expect(paymentPlanOf(invitedByPayment)).toBe("black_anual_2026");
    const black = purchasedPlanSummary("black_anual_2026");
    expect(black?.name).toBe("Black MedStation");
    expect(black?.details).toEqual([
      "12 meses de acesso completo",
      "Pagamento único no cartão de crédito",
      "Sem renovação automática",
    ]);
    expect(black?.details.join(" ")).not.toMatch(/parcel|boleto|pix/i);
    expect(purchasedPlanSummary(null)).toBeNull();
    expect(purchasedPlanSummary("pro_completo")).toBeNull();
  });
});

describe("/obrigado: espera para reenviar o link", () => {
  it("conta 60 s a partir do último envio", () => {
    const sent = 1_000_000;
    expect(resendSecondsLeft(null, sent)).toBe(0);
    expect(resendSecondsLeft(sent, sent)).toBe(60);
    expect(resendSecondsLeft(sent, sent + 59_100)).toBe(1);
    expect(resendSecondsLeft(sent, sent + 60_000)).toBe(0);
  });

  it("redirect do link leva ao onboarding com a marca de compra", () => {
    expect(purchaseActivationRedirect("https://medstation-ai.com.br")).toBe(
      "https://medstation-ai.com.br/onboarding?ativacao=compra",
    );
  });
});

describe("onboarding: nascimento e sexo opcionais", () => {
  const base = { fullName: "Ana Souza", phone: "(11) 98765-4321", birthDate: "", crm: "", crmState: "" };

  it("aceita sem data de nascimento", () => {
    expect(isOnboardingProfileValid(base)).toBe(true);
  });

  it("data preenchida precisa ser válida", () => {
    expect(isOnboardingProfileValid({ ...base, birthDate: "2999-01-01" })).toBe(false);
    expect(isOnboardingProfileValid({ ...base, birthDate: "1990-05-20" })).toBe(true);
  });

  it("WhatsApp continua obrigatório", () => {
    expect(isOnboardingProfileValid({ ...base, phone: "" })).toBe(false);
  });
});
