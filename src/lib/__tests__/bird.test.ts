import { describe, expect, it, vi } from "vitest";
import { birdBaseUrl, parseBirdEvent, sendWhatsappTemplate, signWebhook, verifyWebhook } from "../../../supabase/functions/_shared/bird";

const SECRET = "whsec_" + Buffer.from("segredo-de-teste-com-32-bytes!!!").toString("base64");

describe("birdBaseUrl", () => {
  it("usa a região da chave", () => {
    expect(birdBaseUrl("bk_eu1_abc")).toBe("https://eu1.platform.bird.com");
    expect(birdBaseUrl("bk_us1_abc")).toBe("https://us1.platform.bird.com");
    expect(birdBaseUrl("outra")).toBe("https://us1.platform.bird.com");
    expect(birdBaseUrl("bk_eu1_abc", "https://x.test/")).toBe("https://x.test");
  });
});

describe("verifyWebhook", () => {
  const body = JSON.stringify({ type: "whatsapp.delivered" });
  it("aceita assinatura válida e recente", async () => {
    const sig = await signWebhook(SECRET, "msg_1", "1700000000", body);
    expect(await verifyWebhook(SECRET, { id: "msg_1", timestamp: "1700000000", signature: `v1,outra ${sig}` }, body, 1700000100)).toBe(true);
  });
  it("recusa corpo alterado, carimbo velho e cabeçalho ausente", async () => {
    const sig = await signWebhook(SECRET, "msg_1", "1700000000", body);
    expect(await verifyWebhook(SECRET, { id: "msg_1", timestamp: "1700000000", signature: sig }, body + " ", 1700000000)).toBe(false);
    expect(await verifyWebhook(SECRET, { id: "msg_1", timestamp: "1700000000", signature: sig }, body, 1700000400)).toBe(false);
    expect(await verifyWebhook(SECRET, { id: null, timestamp: "1700000000", signature: sig }, body, 1700000000)).toBe(false);
    expect(await verifyWebhook("", { id: "msg_1", timestamp: "1700000000", signature: sig }, body, 1700000000)).toBe(false);
  });
});

describe("parseBirdEvent", () => {
  it("resposta de texto", () => {
    const ev = parseBirdEvent({
      type: "whatsapp.received",
      timestamp: "2026-11-10T14:00:00Z",
      data: { direction: "inbound", whatsapp_id: "wam_1", from: { phone_number: "+5598981001234" }, text: { body: "SAIR" } },
    });
    expect(ev).toMatchObject({ type: "whatsapp.received", contactPhone: "+5598981001234", text: "SAIR", direction: "inbound" });
  });
  it("toque em botão", () => {
    const ev = parseBirdEvent({
      type: "whatsapp.received",
      data: { direction: "inbound", from: { phone_number: "+5598981001234" }, interactive_reply: { type: "button", button: { slug: "nao_interesse", text: "Não tenho interesse" } } },
    });
    expect(ev.buttonPayload).toBe("nao_interesse");
    expect(ev.text).toBe("Não tenho interesse");
  });
  it("falha com código da Meta", () => {
    const ev = parseBirdEvent({
      type: "whatsapp.failed",
      data: { direction: "outbound", whatsapp_id: "wam_2", to: { phone_number: "+5598981001234" }, error: { code: "undeliverable", meta_error_code: "131026", description: "x", occurred_at: "2026-11-10T14:00:00Z" } },
    });
    expect(ev).toMatchObject({ messageId: "wam_2", contactPhone: "+5598981001234", errorCode: "131026", occurredAt: "2026-11-10T14:00:00Z" });
  });
});

describe("sendWhatsappTemplate", () => {
  const cfg = { apiKey: "bk_us1_x", from: "+5598981862510" };
  const input = { to: "+5598981001234", slug: "medstation_recupera_teste_1", idempotencyKey: "k1", parameters: { "1": "Ana" } };

  it("202 com id = aceito, com idempotência e remetente", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "wam_1", status: "accepted" }), { status: 202 }));
    expect(await sendWhatsappTemplate(cfg, input, fetchFn as unknown as typeof fetch)).toEqual({ ok: true, id: "wam_1", status: "accepted" });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us1.platform.bird.com/v1/whatsapp/messages");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k1");
    expect(JSON.parse(init.body as string)).toMatchObject({ to: input.to, from: cfg.from, template: { slug: input.slug, language: "pt-BR" } });
  });
  it("422 é permanente; 429 tenta de novo depois", async () => {
    const r422 = await sendWhatsappTemplate(cfg, input, (async () => new Response(JSON.stringify({ error: { code: "WhatsAppInvalidRecipient", message: "x" } }), { status: 422 })) as unknown as typeof fetch);
    expect(r422).toMatchObject({ ok: false, permanent: true, code: "WhatsAppInvalidRecipient" });
    const r429 = await sendWhatsappTemplate(cfg, input, (async () => new Response("", { status: 429 })) as unknown as typeof fetch);
    expect(r429).toMatchObject({ ok: false, permanent: false });
  });
});
