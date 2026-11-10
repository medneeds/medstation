// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any -- payloads externos do Bird, sem esquema fixo */
// Cliente mínimo do Bird (WhatsApp) e verificação de assinatura do webhook (Standard Webhooks).
// Sem imports: usa só fetch e Web Crypto, então roda no Deno e no vitest.

export type BirdConfig = {
  apiKey: string;
  /** Número próprio conectado no Bird (E.164), obrigatório para modelos próprios. */
  from: string;
  baseUrl?: string;
  language?: string;
};

/** Host da API pela região da chave (bk_eu1_... → eu1); padrão us1. */
export function birdBaseUrl(apiKey: string, override?: string | null): string {
  if (override) return override.replace(/\/+$/, "");
  const region = /^bk_([a-z]{2}\d)_/i.exec(apiKey)?.[1]?.toLowerCase() ?? "us1";
  return `https://${region}.platform.bird.com`;
}

export type BirdSendResult =
  | { ok: true; id: string; status: string }
  | { ok: false; httpStatus: number; code: string; message: string; permanent: boolean };

/** Envia um modelo aprovado. 202 = aceito (entrega chega pelo webhook); 4xx de validação = erro permanente. */
export async function sendWhatsappTemplate(
  cfg: BirdConfig,
  input: {
    to: string;
    slug: string;
    parameters?: Record<string, string>;
    idempotencyKey: string;
    tags?: { name: string; value: string }[];
    metadata?: Record<string, unknown>;
    reference?: string;
  },
  fetchFn: typeof fetch = fetch,
): Promise<BirdSendResult> {
  const res = await fetchFn(`${birdBaseUrl(cfg.apiKey, cfg.baseUrl)}/v1/whatsapp/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      to: input.to,
      from: cfg.from,
      template: { slug: input.slug, language: cfg.language ?? "pt-BR", parameters: input.parameters },
      tags: input.tags,
      metadata: input.metadata,
      reference: input.reference,
    }),
  });
    let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (res.ok && body?.id) return { ok: true, id: String(body.id), status: String(body.status ?? "accepted") };
  const code = String(body?.error?.code ?? body?.code ?? body?.error?.type ?? `http_${res.status}`);
  const message = String(body?.error?.message ?? body?.message ?? body?.detail ?? res.statusText ?? "erro").slice(0, 500);
  // 422 = destino/modelo inválido (não adianta repetir); 429 e 5xx = tentar na próxima rodada.
  return { ok: false, httpStatus: res.status, code, message, permanent: res.status === 422 || res.status === 400 };
}

// ---------------------------------------------------------------------------
// Webhook: Standard Webhooks (webhook-id, webhook-timestamp, webhook-signature)
// ---------------------------------------------------------------------------

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signWebhook(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${bytesToBase64(sig)}`;
}

/** true só com assinatura válida e carimbo de tempo dentro de 5 minutos. */
export async function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  const expected = await signWebhook(secret, id, timestamp, rawBody);
  return signature.split(" ").some((part) => safeEqual(part.trim(), expected));
}

// ---------------------------------------------------------------------------
// Leitura do evento
// ---------------------------------------------------------------------------

export type BirdEvent = {
  type: string;
  messageId: string | null;
  direction: "inbound" | "outbound" | null;
  /** Celular do contato (de quem enviou, no inbound; destinatário, no outbound). */
  contactPhone: string | null;
  text: string | null;
  buttonPayload: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  occurredAt: string;
};

export function parseBirdEvent(payload: any): BirdEvent {
  const d = payload?.data ?? {};
  const direction = d.direction === "inbound" || d.direction === "outbound" ? d.direction : null;
  const contact = direction === "inbound" ? d.from : d.to;
  const ir = d.interactive_reply ?? null;
  const button = ir ? (ir.button ?? ir[ir.type] ?? null) : null;
  return {
    type: String(payload?.type ?? ""),
    messageId: d.whatsapp_id ? String(d.whatsapp_id) : null,
    direction,
    contactPhone: contact?.phone_number ? String(contact.phone_number) : null,
    text: d.text?.body != null ? String(d.text.body) : button?.text != null ? String(button.text) : null,
    buttonPayload: button?.slug ?? button?.payload ?? button?.id ?? null,
    errorCode: d.error ? String(d.error.meta_error_code ?? d.error.code ?? "") || null : null,
    errorMessage: d.error?.description ? String(d.error.description).slice(0, 500) : null,
    occurredAt: String(d.error?.occurred_at ?? payload?.timestamp ?? new Date().toISOString()),
  };
}
