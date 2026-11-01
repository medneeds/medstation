// Lembretes da Black para quem começou a compra e não concluiu (agendado a cada hora):
// um ~1 h depois da última tentativa e outro ~24 h depois. Quem recebe o quê é
// decidido pela regra pura em _shared/black-recovery.ts; aqui só busca dados,
// reserva o envio em black_recovery_emails (único por e-mail + etapa) e envia.
// Nunca concede acesso nem altera compras.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";
import { BLACK_OFFER, isBlackActive } from "../_shared/pricing-schedule.ts";
import {
  abandonedCheckouts,
  normalizeEmail,
  planRecoveryEmails,
  type RecoveryAttempt,
} from "../_shared/black-recovery.ts";

const SITE_URL = "https://medstation-ai.com.br";
const PAID_UP = ["active", "trialing"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function chunks<T>(list: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isBlackActive()) return json({ skipped: "offer_closed" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // 1. Quem começou e não pagou (mesma regra do painel /admin/black).
  const [leadsRes, attemptsRes, sentRes] = await Promise.all([
    supabase.from("leads").select("email, phone, source, created_at")
      .eq("source", "black_checkout").gte("created_at", BLACK_OFFER.startsAt).limit(10000),
    supabase.from("stripe_one_time_purchases")
      .select("id, email, user_id, status, payment_method, created_at, recovery_url, recovery_status, boleto_expires_at")
      .eq("plan", BLACK_OFFER.slug).limit(10000),
    supabase.from("black_recovery_emails").select("email, step").limit(20000),
  ]);
  if (leadsRes.error || attemptsRes.error || sentRes.error) {
    return json({ error: leadsRes.error?.message ?? attemptsRes.error?.message ?? sentRes.error?.message }, 500);
  }

  const abandoned = abandonedCheckouts({
    leads: leadsRes.data ?? [],
    attempts: (attemptsRes.data ?? []) as (RecoveryAttempt & { user_id: string | null })[],
  });
  const sent = new Map<string, string[]>();
  for (const r of sentRes.data ?? []) sent.set(r.email, [...(sent.get(r.email) ?? []), r.step]);

  const baseInput = { abandoned, offer: BLACK_OFFER, sent };
  const due0 = planRecoveryEmails({ ...baseInput, suppressed: new Set(), purchased: new Set() });
  if (due0.length === 0) return json({ checked: abandoned.length, results: [] });
  const dueEmails = [...new Set(due0.map((d) => d.email))];

  // 2. Descadastrados/bloqueados e quem já comprou (anual pago por e-mail ou pela conta, ou assinatura ativa).
  const suppressed = new Set<string>();
  const purchased = new Set<string>();
  for (const part of chunks(dueEmails)) {
    const { data, error } = await supabase.from("suppressed_emails").select("email").in("email", part);
    if (error) return json({ error: error.message }, 500);
    for (const r of data ?? []) suppressed.add(normalizeEmail(r.email));
  }
  const { data: paidRows, error: paidErr } = await supabase.from("stripe_one_time_purchases")
    .select("email, user_id, plan, access_period")
    .eq("status", "paid").limit(20000);
  if (paidErr) return json({ error: paidErr.message }, 500);
  const paidAnnual = (paidRows ?? []).filter((p) => p.plan === BLACK_OFFER.slug || p.access_period === "annual_12m");
  for (const p of paidAnnual) if (p.email) purchased.add(normalizeEmail(p.email));

  // Conta de cada e-mail ainda pendente (o pagador pode ter usado outro e-mail na conta).
  const pending = new Set(dueEmails.filter((e) => !purchased.has(e) && !suppressed.has(e)));
  const userIdByEmail = new Map<string, string>();
  for (const a of attemptsRes.data ?? []) {
    const email = normalizeEmail(a.email);
    if (a.user_id && pending.has(email)) userIdByEmail.set(email, a.user_id);
  }
  if (pending.size) {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: `listUsers: ${error.message}` }, 500);
      for (const u of data?.users ?? []) {
        const email = normalizeEmail(u.email);
        if (pending.has(email)) userIdByEmail.set(email, u.id);
      }
      if ((data?.users ?? []).length < 1000) break;
    }
    const userIds = [...new Set(userIdByEmail.values())];
    const paidUsers = new Set(paidAnnual.map((p) => p.user_id).filter(Boolean) as string[]);
    for (const part of chunks(userIds)) {
      const { data, error } = await supabase.from("stripe_subscriptions").select("user_id")
        .in("user_id", part).in("status", PAID_UP);
      if (error) return json({ error: error.message }, 500);
      for (const r of data ?? []) if (r.user_id) paidUsers.add(r.user_id);
    }
    for (const [email, userId] of userIdByEmail) if (paidUsers.has(userId)) purchased.add(email);
  }

  const due = planRecoveryEmails({ ...baseInput, suppressed, purchased });

  // 3. Reserva (único por e-mail + etapa) e envia. Se o envio falhar, libera a reserva para a próxima hora.
  const results: { email: string; step: string; outcome: string }[] = [];
  for (const item of due) {
    const { data: claimed, error: claimErr } = await supabase.from("black_recovery_emails")
      .insert({ email: item.email, step: item.step, purchase_id: item.attempt?.id ?? null, outcome: "sending" })
      .select("id").maybeSingle();
    if (claimErr || !claimed) {
      results.push({ email: item.email, step: item.step, outcome: claimErr?.code === "23505" ? "already" : "claim_failed" });
      continue;
    }
    try {
      const unsubscribeUrl = await unsubscribeLink(supabase, item.email);
      const result = await sendTemplateEmailWithLog(`black-recovery-${item.step}`, item.email, {
        templateData: { continueUrl: item.continueUrl, unsubscribeUrl },
        idempotencyKey: `black-recovery-${item.email}-${item.step}`,
        replyTo: "contato@medstation-ai.com.br",
      });
      const outcome = result.sent ? "sent" : "suppressed";
      await supabase.from("black_recovery_emails").update({ outcome, sent_at: new Date().toISOString() }).eq("id", claimed.id);
      results.push({ email: item.email, step: item.step, outcome });
    } catch (err) {
      console.error("[black-recovery] send failed", item.step, (err as Error)?.message);
      await supabase.from("black_recovery_emails").delete().eq("id", claimed.id);
      results.push({ email: item.email, step: item.step, outcome: "failed" });
    }
  }

  return json({
    checked: abandoned.length,
    results: results.map((r) => ({ ...r, email: r.email.replace(/^(.).*(@.*)$/, "$1***$2") })),
  });
});

/** Link de descadastro em um clique (tabela email_unsubscribe_tokens; a página chama email-unsubscribe). */
// deno-lint-ignore no-explicit-any
async function unsubscribeLink(supabase: any, email: string): Promise<string> {
  // Reaproveita o token do e-mail (a tabela pode ter um por e-mail); a página aceita token já usado.
  const { data: existing } = await supabase.from("email_unsubscribe_tokens")
    .select("token").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let token = (existing as { token?: string } | null)?.token;
  if (!token) {
    token = randomToken();
    const { error } = await supabase.from("email_unsubscribe_tokens").insert({ email, token });
    if (error) throw new Error(`unsubscribe token: ${error.message}`);
  }
  return `${SITE_URL}/descadastrar?token=${encodeURIComponent(token)}`;
}
