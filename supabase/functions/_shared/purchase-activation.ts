// Ativação do acesso depois da compra (convite sem senha).
//
// Quem compra sem conta recebe um convite do webhook assim que o pagamento é
// confirmado. Essa conta nasce sem senha: a página /obrigado não pode pedir
// login com senha para ela, e o e-mail precisa dizer que é uma compra (não um
// "convite" genérico). As regras ficam aqui, sem imports, para o complete-checkout,
// o auth-email-hook e os testes do vitest usarem a mesma decisão.

/** Marca no emailRedirectTo do "Reenviar link de acesso" da /obrigado. */
export const PURCHASE_ACTIVATION_PARAM = "ativacao";
export const PURCHASE_ACTIVATION_VALUE = "compra";

export type ActivationAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Conta já usada: e-mail confirmado ou algum login feito. */
export function isAccountActivated(user: ActivationAuthUser): boolean {
  return Boolean(user.last_sign_in_at || user.email_confirmed_at || user.confirmed_at);
}

/** Conta criada por um pagamento confirmado (webhook ou /obrigado). */
export function isPaymentInvitee(user: ActivationAuthUser): boolean {
  return user.user_metadata?.payment_account_setup === true;
}

/** Slug do plano comprado, gravado no convite (user_metadata.payment_plan). */
export function paymentPlanOf(user: ActivationAuthUser | null | undefined): string | null {
  const plan = user?.user_metadata?.payment_plan;
  return typeof plan === "string" && plan.trim() ? plan.trim() : null;
}

export type CheckoutAccountDecision =
  | { kind: "no_account" }
  | { kind: "existing_user" }
  /** Conta existe mas nunca foi ativada (sem senha, sem login). */
  | { kind: "activation_pending"; accessEmailSent: boolean };

export function checkoutAccountDecision(user: ActivationAuthUser | null | undefined): CheckoutAccountDecision {
  if (!user) return { kind: "no_account" };
  if (isAccountActivated(user)) return { kind: "existing_user" };
  // Só dizemos "enviamos seu acesso" quando o convite saiu de um pagamento;
  // uma conta antiga nunca ativada não recebeu nada por esta compra.
  return { kind: "activation_pending", accessEmailSent: isPaymentInvitee(user) };
}

export type CheckoutAccountSetup = "existing_user" | "activation_pending" | "invite_sent" | "invite_failed";

export type CheckoutAccountFields = {
  userExists: boolean;
  /** Mantido para clientes antigos: true = não há senha para usar. */
  passwordWasSkipped: boolean;
  accountSetup: CheckoutAccountSetup;
  /** A /obrigado mostra "ative seu acesso pelo e-mail" em vez do login com senha. */
  needsActivation: boolean;
  /** Um e-mail de acesso já foi enviado por esta compra. */
  accessEmailSent: boolean;
  message: string;
};

export function checkoutAccountFields(setup: CheckoutAccountSetup, accessEmailSent = false): CheckoutAccountFields {
  switch (setup) {
    case "existing_user":
      return {
        userExists: true,
        passwordWasSkipped: false,
        accountSetup: setup,
        needsActivation: false,
        accessEmailSent: false,
        message: "Pagamento confirmado. Entre na sua conta para usar o acesso.",
      };
    case "activation_pending":
      return {
        userExists: false,
        passwordWasSkipped: true,
        accountSetup: setup,
        needsActivation: true,
        accessEmailSent,
        message: accessEmailSent
          ? "Pagamento confirmado. Enviamos o link de acesso para o seu e-mail."
          : "Pagamento confirmado. Peça o link de acesso para entrar.",
      };
    case "invite_sent":
      return {
        userExists: false,
        passwordWasSkipped: true,
        accountSetup: setup,
        needsActivation: true,
        accessEmailSent: true,
        message: "Pagamento confirmado. Enviamos o link de acesso para o seu e-mail.",
      };
    case "invite_failed":
      return {
        userExists: false,
        passwordWasSkipped: true,
        accountSetup: setup,
        needsActivation: true,
        accessEmailSent: false,
        message: "Pagamento confirmado, mas não conseguimos enviar o link de acesso agora.",
      };
  }
}

/** O link de ativação pedido pela /obrigado carrega ?ativacao=compra no redirect. */
export function urlHasPurchaseActivationMarker(url: string | null | undefined): boolean {
  if (!url) return false;
  const marker = `${PURCHASE_ACTIVATION_PARAM}=${PURCHASE_ACTIVATION_VALUE}`;
  if (url.includes(marker)) return true;
  // redirect_to costuma vir codificado dentro do link de verificação.
  try {
    return decodeURIComponent(url).includes(marker);
  } catch {
    return false;
  }
}

export type AuthEmailAction = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "reauthentication";

/** Ações cujo e-mail pode virar o "Pagamento confirmado: ative seu acesso". */
export function mayBePurchaseActivation(actionType: AuthEmailAction, url: string | null | undefined): boolean {
  if (actionType === "invite") return true;
  if (actionType === "signup" || actionType === "magiclink") return urlHasPurchaseActivationMarker(url);
  return false;
}

/**
 * Usa o e-mail de compra só para quem foi convidado por um pagamento e ainda
 * não ativou a conta. O marcador na URL sozinho não basta: qualquer pessoa pode
 * pedir um link para um e-mail, e não mandamos "Pagamento confirmado" a quem
 * não pagou.
 */
export function shouldUsePurchaseActivationEmail(input: {
  actionType: AuthEmailAction;
  url: string | null | undefined;
  user: ActivationAuthUser | null | undefined;
}): boolean {
  const { actionType, url, user } = input;
  if (!user || !mayBePurchaseActivation(actionType, url)) return false;
  return isPaymentInvitee(user) && !isAccountActivated(user);
}

export type PurchasedPlanSummary = {
  name: string;
  /** Linhas curtas e exatas do que foi comprado. */
  details: string[];
};

/** Resumo do plano para o e-mail. Plano desconhecido: sem detalhes (nada inventado). */
export function purchasedPlanSummary(plan: string | null | undefined): PurchasedPlanSummary | null {
  switch (plan) {
    case "black_anual_2026":
      return {
        name: "Black MedStation",
        details: ["12 meses de acesso completo", "Pagamento único no cartão de crédito", "Sem renovação automática"],
      };
    case "pro_completo_yearly":
      return {
        name: "MedStation Completo · plano anual",
        details: ["12 meses de acesso completo", "Pagamento único", "Sem renovação automática"],
      };
    case "pix_monthly_30d":
      return {
        name: "MedStation Completo · 30 dias",
        details: ["30 dias de acesso completo", "Pagamento único via Pix", "Sem renovação automática"],
      };
    default:
      return null;
  }
}

/** Para onde o link de ativação leva (com a marca que o auth-email-hook reconhece). */
export function purchaseActivationRedirect(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/onboarding?${PURCHASE_ACTIVATION_PARAM}=${PURCHASE_ACTIVATION_VALUE}`;
}

export const PURCHASE_ACTIVATION_SUBJECT = "Pagamento confirmado: ative seu acesso à MedStation";

/** Espera mínima entre dois pedidos de link na /obrigado (o Supabase também limita). */
export const RESEND_COOLDOWN_SECONDS = 60;

export function resendSecondsLeft(lastSentAt: number | null, now: number, cooldownSeconds = RESEND_COOLDOWN_SECONDS): number {
  if (!lastSentAt) return 0;
  const left = Math.ceil((lastSentAt + cooldownSeconds * 1000 - now) / 1000);
  return left > 0 ? left : 0;
}
