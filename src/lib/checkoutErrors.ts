/**
 * `supabase.functions.invoke` colapsa respostas não-2xx em uma mensagem genérica
 * ("Edge Function returned a non-2xx status code"). Aqui recuperamos o corpo real
 * para conseguir mostrar mensagens explícitas — em especial `PIX_UNAVAILABLE`,
 * quando o Pix ainda não está habilitado na conta de pagamentos.
 */

export type CheckoutErrorInfo = {
  code: string | null;
  message: string;
};

const FALLBACK_MESSAGE = "Não foi possível iniciar o checkout.";

export function messageForCheckoutError(info: CheckoutErrorInfo): string {
  switch (info.code) {
    case "PIX_UNAVAILABLE":
      return "O pagamento via Pix ainda não está disponível. Use a assinatura mensal no cartão.";
    case "EXISTING_SUBSCRIPTION":
      return "Sua conta já possui uma assinatura ativa.";
    case "LEGACY_PLAN_RETIRED":
      return "Este plano não está mais disponível. Escolha o plano MedStation Completo.";
    default:
      return info.message || FALLBACK_MESSAGE;
  }
}

/** Nunca lança: erro de parsing vira mensagem padrão. */
export async function parseCheckoutError(error: unknown): Promise<CheckoutErrorInfo> {
  const fallback: CheckoutErrorInfo = {
    code: null,
    message: (error as { message?: string })?.message || FALLBACK_MESSAGE,
  };

  const context = (error as { context?: unknown })?.context;
  if (!context || typeof (context as Response).text !== "function") {
    return fallback;
  }

  try {
    const raw = await (context as Response).clone().text();
    if (!raw) return fallback;
    const body = JSON.parse(raw) as { error?: string; code?: string };
    return {
      code: typeof body.code === "string" ? body.code : null,
      message: typeof body.error === "string" && body.error ? body.error : fallback.message,
    };
  } catch {
    return fallback;
  }
}

export async function describeCheckoutError(error: unknown): Promise<string> {
  return messageForCheckoutError(await parseCheckoutError(error));
}
