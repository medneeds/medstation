// Execução da recuperação por WhatsApp: busca dados, aplica a regra pura
// (_shared/whatsapp-recovery.ts) e envia pelo Bird. Usado pela rodada agendada
// (whatsapp-recovery-run) e pelas ações manuais do painel (admin-whatsapp-recovery).
// Nunca concede acesso nem altera compras.
// deno-lint-ignore-file no-explicit-any
import { resolveUserAccess } from "./access-control.ts";
import { sendWhatsappTemplate, type BirdConfig } from "./bird.ts";
import {
  DEFAULT_DAILY_NEW_CAP,
  firstName,
  localDayStart,
  normalizeEmail,
  planRecoveryRun,
  recoveryLink,
  templateSlug,
  type RecoveryCandidate,
  type RecoveryContact,
  type RecoverySegment,
  type WaStep,
} from "./whatsapp-recovery.ts";

const PAYING_SUB = new Set(["active", "trialing", "past_due"]);
export const AUTO_FLAG = "whatsapp_recovery_auto";

export type CandidateInfo = RecoveryCandidate & { createdAt: string | null; lastSignInAt: string | null };

/** Config do Bird pelos segredos da função. Null = ainda não configurado (nada é enviado). */
export function birdConfigFromEnv(): BirdConfig | null {
  const apiKey = Deno.env.get("BIRD_API_KEY") ?? "";
  const from = Deno.env.get("BIRD_WHATSAPP_FROM") ?? "";
  if (!apiKey || !from) return null;
  return { apiKey, from, baseUrl: Deno.env.get("BIRD_API_BASE") || undefined, language: Deno.env.get("BIRD_WHATSAPP_LANGUAGE") || "pt-BR" };
}

export function dailyCapFromEnv(): number {
  const n = Number(Deno.env.get("WA_RECOVERY_DAILY_CAP"));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_DAILY_NEW_CAP;
}

/** Caminho da página de destino dos links (durante a Black: /black; depois: /pricing). */
export function landingPathFromEnv(): string {
  return Deno.env.get("WA_RECOVERY_LANDING_PATH") || "/black";
}

/** Todos os usuários com o que a regra precisa. Leitura em lote (service role). */
export async function loadCandidates(supabase: any): Promise<CandidateInfo[]> {
  const users: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < 1000) break;
  }

  const [profiles, roles, courtesy, access, subs, purchases] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, professional_status").limit(20000),
    supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    supabase.from("courtesy_access").select("user_id").limit(20000),
    supabase.from("user_access").select("user_id, trial_ends_at").limit(20000),
    supabase.from("stripe_subscriptions").select("user_id, status, last_payment_succeeded_at").not("user_id", "is", null).limit(20000),
    supabase.from("stripe_one_time_purchases").select("user_id, email, access_end").eq("status", "paid").limit(20000),
  ]);
  for (const r of [profiles, roles, courtesy, access, subs, purchases]) if (r.error) throw new Error(r.error.message);

  const profileById = new Map((profiles.data ?? []).map((p: any) => [p.id, p]));
  const admins = new Set((roles.data ?? []).map((r: any) => r.user_id));
  const courtesyUsers = new Set((courtesy.data ?? []).map((r: any) => r.user_id));
  const trialEnd = new Map((access.data ?? []).map((r: any) => [r.user_id, r.trial_ends_at]));
  const payingUsers = new Set<string>();
  const everPaidUsers = new Set<string>();
  for (const s of subs.data ?? []) {
    if (PAYING_SUB.has(s.status)) payingUsers.add(s.user_id);
    if (s.last_payment_succeeded_at || PAYING_SUB.has(s.status)) everPaidUsers.add(s.user_id);
  }
  const now = Date.now();
  const payingEmails = new Set<string>();
  const everPaidEmails = new Set<string>();
  for (const p of purchases.data ?? []) {
    const active = p.access_end && Date.parse(p.access_end) > now;
    if (p.user_id) {
      everPaidUsers.add(p.user_id);
      if (active) payingUsers.add(p.user_id);
    }
    const email = normalizeEmail(p.email);
    if (email) {
      everPaidEmails.add(email);
      if (active) payingEmails.add(email);
    }
  }

  return users.map((u) => {
    const p: any = profileById.get(u.id) ?? {};
    const email = normalizeEmail(u.email);
    return {
      userId: u.id,
      email: email || null,
      fullName: p.full_name ?? u.user_metadata?.full_name ?? null,
      phone: p.phone ?? null,
      professionalStatus: p.professional_status ?? null,
      isAdmin: admins.has(u.id),
      isPaying: payingUsers.has(u.id) || (!!email && payingEmails.has(email)),
      hasCourtesy: courtesyUsers.has(u.id),
      everPaid: everPaidUsers.has(u.id) || (!!email && everPaidEmails.has(email)),
      trialEndsAt: (trialEnd.get(u.id) as string | undefined) ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });
}

export async function loadState(supabase: any, now = Date.now()) {
  const [contacts, optOuts, enrolledToday, flag] = await Promise.all([
    supabase.from("whatsapp_recovery_contacts").select("*").limit(20000),
    supabase.from("whatsapp_opt_outs").select("phone_e164").limit(20000),
    supabase.from("whatsapp_recovery_contacts").select("id", { count: "exact", head: true })
      .gte("entered_at", new Date(localDayStart(now)).toISOString()),
    supabase.from("feature_flags").select("enabled_global").eq("key", AUTO_FLAG).maybeSingle(),
  ]);
  for (const r of [contacts, optOuts, enrolledToday, flag]) if (r.error) throw new Error(r.error.message);
  return {
    contacts: (contacts.data ?? []) as (RecoveryContact & { updated_at?: string; note?: string | null })[],
    optedOutPhones: new Set<string>((optOuts.data ?? []).map((r: any) => r.phone_e164)),
    enrolledToday: enrolledToday.count ?? 0,
    autoEnabled: !!flag.data?.enabled_global,
  };
}

export type SendOutcome = "sent" | "converted" | "already" | "failed" | "retry" | "skipped_access_check" | "not_configured";

/**
 * Envia uma etapa a um contato. Antes de enviar, confere o acesso real do usuário
 * (mesma resolução do app, inclui Stripe por e-mail): quem paga ou tem cortesia não recebe.
 * A etapa é reservada em whatsapp_recovery_messages (único por contato + etapa) e só liberada se o envio falhar de forma transitória.
 */
export async function sendStep(
  supabase: any,
  cfg: BirdConfig | null,
  contact: RecoveryContact,
  step: WaStep,
  who: { userId: string; email: string | null; createdAt: string | null; fullName: string | null },
  opts: { trigger: "auto" | "manual"; landingPath: string },
): Promise<SendOutcome> {
  if (!cfg) return "not_configured";

  try {
    const access = await resolveUserAccess({ id: who.userId, email: who.email ?? undefined, created_at: who.createdAt ?? new Date().toISOString() });
    if (access.status === "verification_error") return "skipped_access_check";
    if (access.isPaidSubscriber || access.status === "paid_active" || access.status === "past_due") {
      await supabase.from("whatsapp_recovery_contacts")
        .update({ status: "converted", converted_at: new Date().toISOString(), closed_at: new Date().toISOString() })
        .eq("id", contact.id);
      return "converted";
    }
    if (access.status === "admin" || access.status === "courtesy_active" || access.status === "trial_active") {
      await supabase.from("whatsapp_recovery_contacts")
        .update({ status: "paused", note: `pausado: acesso ${access.status}` }).eq("id", contact.id);
      return "skipped_access_check";
    }
  } catch (err) {
    console.error("[wa-recovery] access check failed", (err as Error)?.message);
    return "skipped_access_check";
  }

  const slug = templateSlug(contact.segment as RecoverySegment, step);
  const { data: claimed, error: claimErr } = await supabase.from("whatsapp_recovery_messages")
    .insert({ contact_id: contact.id, step, template_slug: slug, status: "sending", triggered_by: opts.trigger })
    .select("id").maybeSingle();
  if (claimErr || !claimed) return claimErr?.code === "23505" ? "already" : "retry";

  let result;
  try {
    result = await sendWhatsappTemplate(cfg, {
      to: contact.phone_e164,
      slug,
      parameters: {
        "1": firstName(who.fullName),
        button_url: recoveryLink(contact.segment as RecoverySegment, step, opts.landingPath).replace(/^https:\/\/[^/]+\//, ""),
      },
      idempotencyKey: `wa-recovery-${contact.id}-${step}`,
      tags: [
        { name: "flow", value: "recovery" },
        { name: "segment", value: contact.segment },
        { name: "step", value: String(step) },
      ],
      metadata: { contact_id: contact.id, step },
      reference: `wa-recovery-${contact.id}`,
    });
  } catch (err) {
    console.error("[wa-recovery] send threw", (err as Error)?.message);
    await supabase.from("whatsapp_recovery_messages").delete().eq("id", claimed.id);
    return "retry";
  }

  const nowIso = new Date().toISOString();
  if (result.ok) {
    await supabase.from("whatsapp_recovery_messages")
      .update({ bird_message_id: result.id, status: "accepted", sent_at: nowIso }).eq("id", claimed.id);
    await supabase.from("whatsapp_recovery_contacts")
      .update({ last_step: Math.max(step, contact.last_step), last_sent_at: nowIso }).eq("id", contact.id);
    return "sent";
  }
  if (result.permanent) {
    await supabase.from("whatsapp_recovery_messages")
      .update({ status: "failed", error_code: result.code, error_message: result.message }).eq("id", claimed.id);
    await supabase.from("whatsapp_recovery_contacts")
      .update({ status: "failed", closed_at: nowIso, note: `envio recusado: ${result.code}` }).eq("id", contact.id);
    return "failed";
  }
  console.error("[wa-recovery] transient send error", result.httpStatus, result.code);
  await supabase.from("whatsapp_recovery_messages").delete().eq("id", claimed.id);
  return "retry";
}

export type RunSummary = {
  dryRun: boolean;
  configured: boolean;
  enrolled: number;
  sent: Record<string, number>;
  closed: Record<string, number>;
  plan: { enroll: number; send: number; close: number };
  preview?: { enroll: { userId: string; segment: string }[]; send: { contactId: string; step: number }[] };
};

/** Uma rodada completa. dryRun = só calcula (para o painel mostrar o que sairia agora). */
export async function runRecovery(
  supabase: any,
  opts: { trigger: "auto" | "manual"; dryRun?: boolean; now?: number } = { trigger: "auto" },
): Promise<RunSummary> {
  const now = opts.now ?? Date.now();
  const cfg = birdConfigFromEnv();
  const [candidates, state] = await Promise.all([loadCandidates(supabase), loadState(supabase, now)]);
  const plan = planRecoveryRun({
    candidates,
    contacts: state.contacts,
    optedOutPhones: state.optedOutPhones,
    enrolledToday: state.enrolledToday,
    dailyNewCap: dailyCapFromEnv(),
    now,
  });
  const summary: RunSummary = {
    dryRun: !!opts.dryRun,
    configured: !!cfg,
    enrolled: 0,
    sent: {},
    closed: {},
    plan: { enroll: plan.enroll.length, send: plan.send.length, close: plan.close.length },
  };
  if (opts.dryRun) {
    summary.preview = {
      enroll: plan.enroll.map((e) => ({ userId: e.userId, segment: e.segment })),
      send: plan.send,
    };
    return summary;
  }

  const nowIso = new Date(now).toISOString();
  for (const c of plan.close) {
    const patch: Record<string, unknown> = { status: c.status, closed_at: nowIso };
    if (c.status === "converted") patch.converted_at = nowIso;
    const { error } = await supabase.from("whatsapp_recovery_contacts").update(patch).eq("id", c.contactId);
    if (!error) summary.closed[c.status] = (summary.closed[c.status] ?? 0) + 1;
  }
  if (!cfg) return summary; // sem Bird configurado: só fecha conversões/concluídos

  const byUser = new Map(candidates.map((c) => [c.userId, c]));
  const contactById = new Map(state.contacts.map((c) => [c.id, c]));
  const count = (o: SendOutcome) => (summary.sent[o] = (summary.sent[o] ?? 0) + 1);
  const landingPath = landingPathFromEnv();

  for (const item of plan.send) {
    const contact = contactById.get(item.contactId);
    const who = contact && byUser.get(contact.user_id);
    if (!contact || !who) continue;
    count(await sendStep(supabase, cfg, contact, item.step, who, { trigger: opts.trigger, landingPath }));
  }

  for (const e of plan.enroll) {
    const who = byUser.get(e.userId);
    if (!who) continue;
    const { data: created, error } = await supabase.from("whatsapp_recovery_contacts")
      .insert({ user_id: e.userId, phone_e164: e.phoneE164, segment: e.segment, status: "active", entered_at: nowIso })
      .select("*").maybeSingle();
    if (error || !created) continue; // unique(user_id): outra rodada já inscreveu
    summary.enrolled++;
    const outcome = await sendStep(supabase, cfg, created, 1, who, { trigger: opts.trigger, landingPath });
    count(outcome);
    // Não conseguiu nem a primeira etapa por motivo transitório: desfaz a inscrição para tentar de novo e não gastar a cota.
    if (outcome === "retry" || outcome === "skipped_access_check") {
      const { data: row } = await supabase.from("whatsapp_recovery_contacts").select("status").eq("id", created.id).maybeSingle();
      if (row?.status === "active") {
        await supabase.from("whatsapp_recovery_contacts").delete().eq("id", created.id);
        summary.enrolled--;
      }
    }
  }
  return summary;
}
