// Webhook do Bird para a recuperação por WhatsApp: status de entrega (sent/delivered/read/failed),
// respostas (whatsapp.received) e bloqueios (whatsapp_suppression.created).
// Só aceita entregas assinadas (Standard Webhooks, segredo BIRD_WEBHOOK_SECRET) e processa cada evento uma vez.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseBirdEvent, verifyWebhook } from "../_shared/bird.ts";
import { inboundIntent, isPermanentFailure, mergeMessageStatus, normalizeBrMobile, type MessageStatus } from "../_shared/whatsapp-recovery.ts";

const ok = (body: unknown = { ok: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const STATUS_BY_TYPE: Record<string, string> = {
  "whatsapp.accepted": "accepted",
  "whatsapp.sent": "sent",
  "whatsapp.delivered": "delivered",
  "whatsapp.read": "read",
  "whatsapp.failed": "failed",
  "whatsapp.rejected": "failed",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "method" }, 405);
  const raw = await req.text();
  const secret = Deno.env.get("BIRD_WEBHOOK_SECRET") ?? "";
  const valid = await verifyWebhook(secret, {
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  }, raw);
  if (!valid) return ok({ error: "invalid_signature" }, 401);

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return ok({ error: "invalid_json" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Uma vez por evento (o Bird reenvia quando não recebe 2xx).
  const eventId = req.headers.get("webhook-id")!;
  const { error: dupErr } = await supabase.from("bird_webhook_events").insert({ id: eventId, type: String(payload?.type ?? "") });
  if (dupErr?.code === "23505") return ok({ duplicate: true });

  try {
    await handle(supabase, payload);
    return ok();
  } catch (err) {
    console.error("[bird-whatsapp-webhook]", (err as Error)?.message);
    await supabase.from("bird_webhook_events").delete().eq("id", eventId); // deixa o reenvio processar
    return ok({ error: "processing_failed" }, 500);
  }
});

async function handle(supabase: any, payload: any) {
  const ev = parseBirdEvent(payload);

  if (ev.type === "whatsapp_suppression.created") {
    const phone = normalizeBrMobile(payload?.data?.phone_number ?? payload?.data?.recipient ?? null);
    if (phone) await optOut(supabase, phone, "bird_suppression");
    return;
  }

  const outgoingStatus = STATUS_BY_TYPE[ev.type];
  if (outgoingStatus && ev.messageId) {
    const { data: msg } = await supabase.from("whatsapp_recovery_messages")
      .select("id, contact_id, status").eq("bird_message_id", ev.messageId).maybeSingle();
    if (!msg) return; // mensagem de outro fluxo
    const next = mergeMessageStatus(msg.status as MessageStatus, outgoingStatus);
    const patch: Record<string, unknown> = { status: next };
    if (outgoingStatus === "delivered") patch.delivered_at = ev.occurredAt;
    if (outgoingStatus === "read") patch.read_at = ev.occurredAt;
    if (next === "failed") {
      patch.error_code = ev.errorCode;
      patch.error_message = ev.errorMessage;
    }
    await supabase.from("whatsapp_recovery_messages").update(patch).eq("id", msg.id);
    if (next === "failed" && isPermanentFailure(ev.errorCode)) {
      await supabase.from("whatsapp_recovery_contacts")
        .update({ status: "failed", closed_at: new Date().toISOString(), note: `WhatsApp recusou: ${ev.errorCode}` })
        .eq("id", msg.contact_id).eq("status", "active");
    }
    return;
  }

  if (ev.type === "whatsapp.received") {
    const phone = normalizeBrMobile(ev.contactPhone);
    if (!phone) return;
    const intent = inboundIntent(ev.text, ev.buttonPayload);
    if (intent === "opt_out") {
      await optOut(supabase, phone, "reply");
      return;
    }
    // Respondeu: sai da automação e aparece no painel para conversa manual.
    await supabase.from("whatsapp_recovery_contacts")
      .update({ status: "replied", last_inbound_at: ev.occurredAt, last_inbound_text: (ev.text ?? "[mídia]").slice(0, 500) })
      .eq("phone_e164", phone).in("status", ["active", "finished", "paused"]);
    await supabase.from("whatsapp_recovery_contacts")
      .update({ last_inbound_at: ev.occurredAt, last_inbound_text: (ev.text ?? "[mídia]").slice(0, 500) })
      .eq("phone_e164", phone).eq("status", "replied");
  }
}

async function optOut(supabase: any, phone: string, source: string) {
  await supabase.from("whatsapp_opt_outs").upsert({ phone_e164: phone, source }, { onConflict: "phone_e164", ignoreDuplicates: true });
  await supabase.from("whatsapp_recovery_contacts")
    .update({ status: "opted_out", closed_at: new Date().toISOString() })
    .eq("phone_e164", phone).neq("status", "converted");
}
