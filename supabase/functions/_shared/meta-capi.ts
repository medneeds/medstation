// API de Conversões da Meta: a compra confirmada também sai do servidor.
//
// Por quê: o Pixel só registra a compra quando o comprador volta para /obrigado
// com o navegador e o consentimento intactos. Boleto (pago dias depois),
// bloqueador de anúncios e Safari perdem essa volta, e a Meta otimiza a
// campanha com metade das vendas.
//
// Regra de privacidade (LGPD, mesma decisão do Pixel em src/lib/consent.ts):
// o evento só sai quando o comprador aceitou cookies de marketing ANTES de
// abrir o checkout. O navegador manda esse aceite no corpo do checkout, ele vai
// para os metadados da sessão do Stripe (mkt_consent=1) e o webhook só envia
// se encontrar a marca. O e-mail vai em SHA-256, nunca em texto.
//
// Deduplicação: event_id = id da sessão do Stripe, o mesmo eventID que
// /obrigado usa no Pixel (src/lib/conversion.ts), então a Meta conta uma vez.
//
// Módulo sem dependências: roda no Deno (edge functions) e no vitest.

export const META_PIXEL_ID = "1120398934987866";
export const META_GRAPH_VERSION = "v21.0";

export type CheckoutTracking = {
  consent?: unknown;
  fbp?: unknown;
  fbc?: unknown;
};

const FBP = /^fb\.\d\.\d{10,16}\.\d{1,20}$/;
const FBC = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_-]{1,400}$/;

/**
 * Metadados de rastreio para a sessão do Stripe. Sem aceite de marketing,
 * nada é gravado. Valores fora do formato dos cookies da Meta são descartados.
 */
export function trackingMetadata(
  tracking: CheckoutTracking | null | undefined,
  request?: { ip?: string | null; userAgent?: string | null },
): Record<string, string> {
  if (!tracking || tracking.consent !== true) return {};
  const out: Record<string, string> = { mkt_consent: "1" };
  if (typeof tracking.fbp === "string" && FBP.test(tracking.fbp)) out.fbp = tracking.fbp;
  if (typeof tracking.fbc === "string" && FBC.test(tracking.fbc)) out.fbc = tracking.fbc;
  const ip = request?.ip?.split(",")[0]?.trim();
  if (ip && ip.length <= 64) out.client_ip = ip;
  const ua = request?.userAgent?.trim();
  if (ua) out.client_ua = ua.slice(0, 450);
  return out;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/**
 * UTMs do anúncio para os metadados da sessão do Stripe. UTM não é dado
 * pessoal, então vai com ou sem aceite de cookies: assim a venda fica
 * atribuída à campanha mesmo quando a Meta não recebe o evento.
 */
export function utmMetadata(utm: unknown): Record<string, string> {
  if (!utm || typeof utm !== "object") return {};
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = (utm as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const clean = value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 100);
    if (clean) out[key] = clean;
  }
  return out;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type PurchaseInput = {
  sessionId: string;
  email?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  metadata?: Record<string, string | undefined> | null;
  eventTime?: number;
  sourceUrl?: string;
};

/** Envia ou não: só com aceite registrado no checkout e sessão identificada. */
export function shouldSendPurchase(input: Pick<PurchaseInput, "sessionId" | "metadata">): boolean {
  return Boolean(input.sessionId) && input.metadata?.mkt_consent === "1";
}

/** Corpo do POST /{pixel}/events com um único evento Purchase. */
export async function buildPurchasePayload(input: PurchaseInput) {
  const meta = input.metadata ?? {};
  const userData: Record<string, unknown> = {};
  const email = input.email?.trim().toLowerCase();
  if (email) userData.em = [await sha256Hex(email)];
  if (meta.fbp) userData.fbp = meta.fbp;
  if (meta.fbc) userData.fbc = meta.fbc;
  if (meta.client_ip) userData.client_ip_address = meta.client_ip;
  if (meta.client_ua) userData.client_user_agent = meta.client_ua;

  return {
    data: [
      {
        event_name: "Purchase",
        event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: input.sessionId,
        action_source: "website",
        event_source_url: input.sourceUrl ?? "https://medstation-ai.com.br/obrigado",
        user_data: userData,
        custom_data: {
          currency: (input.currency || "brl").toUpperCase(),
          value: typeof input.amountCents === "number" ? Math.round(input.amountCents) / 100 : 0,
          content_name: meta.plan ?? undefined,
        },
      },
    ],
  };
}

/**
 * Envia a compra para a Meta. Nunca lança: falha aqui não pode derrubar o
 * webhook de pagamento. Sem META_CAPI_ACCESS_TOKEN configurado, não faz nada.
 */
export async function sendPurchaseToMeta(
  input: PurchaseInput,
  env: { token?: string | null; testEventCode?: string | null },
  fetchFn: typeof fetch = fetch,
): Promise<{ sent: boolean; reason?: string; status?: number }> {
  try {
    if (!env.token) return { sent: false, reason: "no_token" };
    if (!shouldSendPurchase(input)) return { sent: false, reason: "no_consent" };
    const payload: Record<string, unknown> = await buildPurchasePayload(input);
    if (env.testEventCode) payload.test_event_code = env.testEventCode;
    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.token)}`;
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok ? { sent: true, status: res.status } : { sent: false, reason: "http_error", status: res.status };
  } catch (error) {
    return { sent: false, reason: (error as Error)?.message?.slice(0, 120) || "error" };
  }
}
