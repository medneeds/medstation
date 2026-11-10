// Painel da recuperação por WhatsApp (somente admin).
// GET  → visão geral: configuração, funil, contatos em cadência, elegíveis ainda fora e motivos de exclusão.
// POST → ações: preview | run_now | send_next | enroll | set_status | opt_out | toggle_auto.
// Toda ação manual vai para audit_log. O envio usa as mesmas checagens da rodada automática.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  AUTO_FLAG,
  birdConfigFromEnv,
  dailyCapFromEnv,
  landingPathFromEnv,
  loadCandidates,
  loadState,
  runRecovery,
  sendStep,
} from "../_shared/whatsapp-recovery-engine.ts";
import {
  classifyCandidate,
  isWithinSendWindow,
  recoveryFunnel,
  RECOVERY_SEGMENTS,
  templateSlug,
  WA_STEPS,
  type ContactStatus,
  type WaStep,
} from "../_shared/whatsapp-recovery.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MANUAL_STATUSES: ContactStatus[] = ["active", "paused", "replied", "finished"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: null };
  const adminId = auth?.user?.id;
  if (!adminId) return json({ error: "unauthorized" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: adminId, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  try {
    if (req.method === "GET") return json(await overview(supabase));
    const body = await req.json().catch(() => ({}));
    const result = await action(supabase, adminId, body);
    return json(result, result?.error ? 400 : 200);
  } catch (err) {
    console.error("[admin-whatsapp-recovery]", (err as Error)?.message);
    return json({ error: (err as Error)?.message ?? "erro" }, 500);
  }
});

async function audit(supabase: any, adminId: string, actionName: string, targetUserId: string | null, metadata: unknown) {
  await supabase.from("audit_log").insert({ admin_id: adminId, action: `wa_recovery.${actionName}`, target_user_id: targetUserId, metadata });
}

async function overview(supabase: any) {
  const now = Date.now();
  const [candidates, state, messagesRes] = await Promise.all([
    loadCandidates(supabase),
    loadState(supabase, now),
    supabase.from("whatsapp_recovery_messages")
      .select("id, contact_id, step, template_slug, status, error_code, error_message, triggered_by, created_at, sent_at, delivered_at, read_at")
      .order("created_at", { ascending: false }).limit(20000),
  ]);
  if (messagesRes.error) throw new Error(messagesRes.error.message);
  const messages = messagesRes.data ?? [];
  const byUser = new Map(candidates.map((c) => [c.userId, c]));
  const enrolledUsers = new Set(state.contacts.map((c) => c.user_id));

  const reasons: Record<string, number> = {};
  const eligible: any[] = [];
  let paying = 0;
  for (const c of candidates) {
    if (c.isPaying) paying++;
    const cls = classifyCandidate(c, { optedOutPhones: state.optedOutPhones, now });
    if (!cls.eligible) {
      reasons[cls.reason] = (reasons[cls.reason] ?? 0) + 1;
      continue;
    }
    if (enrolledUsers.has(c.userId)) continue;
    eligible.push({
      user_id: c.userId,
      name: c.fullName,
      email: c.email,
      phone: cls.phoneE164,
      segment: cls.segment,
      trial_ends_at: c.trialEndsAt,
      last_sign_in_at: c.lastSignInAt,
      created_at: c.createdAt,
    });
  }
  eligible.sort((a, b) => (b.trial_ends_at ?? "").localeCompare(a.trial_ends_at ?? ""));

  const msgsByContact = new Map<string, any[]>();
  for (const m of messages) msgsByContact.set(m.contact_id, [...(msgsByContact.get(m.contact_id) ?? []), m]);
  const contacts = state.contacts
    .map((c) => {
      const who = byUser.get(c.user_id);
      return {
        ...c,
        name: who?.fullName ?? null,
        email: who?.email ?? null,
        messages: (msgsByContact.get(c.id) ?? []).sort((a, b) => a.step - b.step),
      };
    })
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));

  const cfg = birdConfigFromEnv();
  return {
    generated_at: new Date(now).toISOString(),
    config: {
      bird_configured: !!cfg,
      from: cfg?.from ?? null,
      webhook_configured: !!Deno.env.get("BIRD_WEBHOOK_SECRET"),
      auto_enabled: state.autoEnabled,
      daily_cap: dailyCapFromEnv(),
      enrolled_today: state.enrolledToday,
      landing_path: landingPathFromEnv(),
      send_window_open: isWithinSendWindow(now),
      templates: RECOVERY_SEGMENTS.flatMap((s) => WA_STEPS.map((step) => ({ segment: s, step, slug: templateSlug(s, step) }))),
    },
    totals: { users: candidates.length, paying, eligible_waiting: eligible.length, opted_out: state.optedOutPhones.size },
    funnel: recoveryFunnel(state.contacts, messages),
    ineligible_reasons: reasons,
    eligible,
    contacts,
  };
}

async function action(supabase: any, adminId: string, body: any): Promise<any> {
  const name = String(body?.action ?? "");

  if (name === "preview") return await runRecovery(supabase, { trigger: "manual", dryRun: true });

  if (name === "run_now") {
    const summary = await runRecovery(supabase, { trigger: "manual" });
    await audit(supabase, adminId, "run_now", null, summary);
    return summary;
  }

  if (name === "toggle_auto") {
    const enabled = !!body.enabled;
    if (enabled && !birdConfigFromEnv()) return { error: "Configure BIRD_API_KEY e BIRD_WHATSAPP_FROM antes de ligar o envio automático." };
    const { error } = await supabase.from("feature_flags")
      .upsert({ key: AUTO_FLAG, enabled_global: enabled, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return { error: error.message };
    await audit(supabase, adminId, "toggle_auto", null, { enabled });
    return { ok: true, enabled };
  }

  if (name === "enroll") {
    const userId = String(body.userId ?? "");
    const [candidates, state] = await Promise.all([loadCandidates(supabase), loadState(supabase)]);
    const who = candidates.find((c) => c.userId === userId);
    if (!who) return { error: "Usuário não encontrado." };
    if (state.contacts.some((c) => c.user_id === userId)) return { error: "Já está na recuperação." };
    const cls = classifyCandidate(who, { optedOutPhones: state.optedOutPhones });
    if (!cls.eligible) return { error: `Não elegível: ${cls.reason}` };
    if (state.contacts.some((c) => c.phone_e164 === cls.phoneE164)) return { error: "Este celular já está em outra conta da recuperação." };
    const { data: created, error } = await supabase.from("whatsapp_recovery_contacts")
      .insert({ user_id: userId, phone_e164: cls.phoneE164, segment: cls.segment, status: "active" }).select("*").maybeSingle();
    if (error || !created) return { error: error?.message ?? "Não foi possível inscrever." };
    const outcome = await sendStep(supabase, birdConfigFromEnv(), created, 1, who, { trigger: "manual", landingPath: landingPathFromEnv() });
    if (outcome !== "sent") {
      const { data: row } = await supabase.from("whatsapp_recovery_contacts").select("status, last_step").eq("id", created.id).maybeSingle();
      if (row?.status === "active" && row.last_step === 0) await supabase.from("whatsapp_recovery_contacts").delete().eq("id", created.id);
    }
    await audit(supabase, adminId, "enroll", userId, { outcome, segment: cls.segment });
    return { ok: outcome === "sent", outcome };
  }

  const contactId = String(body.contactId ?? "");
  const { data: contact } = await supabase.from("whatsapp_recovery_contacts").select("*").eq("id", contactId).maybeSingle();
  if (!contact) return { error: "Contato não encontrado." };

  if (name === "send_next") {
    if (contact.status !== "active" && contact.status !== "paused") return { error: "Só contatos em cadência ou pausados recebem a próxima etapa." };
    const step = (contact.last_step + 1) as WaStep;
    if (!WA_STEPS.includes(step)) return { error: "As 3 etapas já foram enviadas." };
    const { data: opted } = await supabase.from("whatsapp_opt_outs").select("phone_e164").eq("phone_e164", contact.phone_e164).maybeSingle();
    if (opted) return { error: "Este contato pediu para sair." };
    const candidates = await loadCandidates(supabase);
    const who = candidates.find((c) => c.userId === contact.user_id);
    if (!who) return { error: "Conta não encontrada." };
    if (contact.status === "paused") await supabase.from("whatsapp_recovery_contacts").update({ status: "active" }).eq("id", contact.id);
    const outcome = await sendStep(supabase, birdConfigFromEnv(), { ...contact, status: "active" }, step, who, { trigger: "manual", landingPath: landingPathFromEnv() });
    await audit(supabase, adminId, "send_next", contact.user_id, { step, outcome });
    return { ok: outcome === "sent", outcome, step };
  }

  if (name === "set_status") {
    const status = String(body.status ?? "") as ContactStatus;
    if (!MANUAL_STATUSES.includes(status)) return { error: "Status inválido." };
    const patch: Record<string, unknown> = { status, note: body.note ? String(body.note).slice(0, 500) : contact.note };
    patch.closed_at = status === "finished" ? new Date().toISOString() : null;
    const { error } = await supabase.from("whatsapp_recovery_contacts").update(patch).eq("id", contact.id);
    if (error) return { error: error.message };
    await audit(supabase, adminId, "set_status", contact.user_id, { from: contact.status, to: status });
    return { ok: true };
  }

  if (name === "opt_out") {
    await supabase.from("whatsapp_opt_outs").upsert({ phone_e164: contact.phone_e164, source: "admin" }, { onConflict: "phone_e164", ignoreDuplicates: true });
    await supabase.from("whatsapp_recovery_contacts").update({ status: "opted_out", closed_at: new Date().toISOString() }).eq("id", contact.id);
    await audit(supabase, adminId, "opt_out", contact.user_id, {});
    return { ok: true };
  }

  return { error: "Ação desconhecida." };
}
