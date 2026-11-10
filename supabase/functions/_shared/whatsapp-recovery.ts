// Recuperação por WhatsApp (Bird): quem entra, quando recebe cada etapa e quando para.
// Regra pura (sem rede, sem imports), usada pela função agendada whatsapp-recovery-run,
// pelo painel admin-whatsapp-recovery e pelo webhook bird-whatsapp-webhook. Testável no vitest.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// Segmentos e etapas
// ---------------------------------------------------------------------------

/** trial_expired = fez o teste grátis e nunca pagou; ex_subscriber = já pagou e não paga mais. */
export type RecoverySegment = "trial_expired" | "ex_subscriber";
export const RECOVERY_SEGMENTS: RecoverySegment[] = ["trial_expired", "ex_subscriber"];

export type WaStep = 1 | 2 | 3;
export const WA_STEPS: WaStep[] = [1, 2, 3];

/** Dias depois da etapa anterior (etapa 1 sai na entrada). */
export const WA_STEP_DELAY_DAYS: Record<WaStep, number> = { 1: 0, 2: 3, 3: 4 };

/** O teste precisa ter acabado há pelo menos isto antes da primeira mensagem. */
export const MIN_HOURS_AFTER_TRIAL_END = 24;
/** Não entra quem acabou o teste há mais disto (contato frio demais para WhatsApp). */
export const MAX_DAYS_AFTER_TRIAL_END = 365;

/** Novos contatos por dia: protege a nota de qualidade do número na Meta. */
export const DEFAULT_DAILY_NEW_CAP = 30;

/** Horário de envio em Fortaleza (UTC-3, sem horário de verão): seg–sáb, 9h às 19h59. */
export const SEND_WINDOW = { fromHour: 9, toHour: 20, utcOffsetHours: -3, sunday: false };

/** Nunca recebem (o dono testa com o próprio cadastro). */
export const WA_SKIP_EMAILS = new Set(["arturaugustosb@gmail.com"]);

export const SITE_URL = "https://medstation-ai.com.br";

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

/**
 * Celular brasileiro em E.164 (+55 DDD 9XXXX-XXXX). Null se não for celular válido:
 * fixo não recebe WhatsApp de forma confiável e número errado queima a qualidade do envio.
 */
export function normalizeBrMobile(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  else if (d.length === 12 && d.startsWith("0")) d = d.slice(1); // 0 + DDD + número
  if (d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99 || d[1] === "0") return null;
  if (d[2] !== "9") return null; // celular começa com 9
  if (/^(\d)\1+$/.test(d.slice(2))) return null; // 99999-9999, 98888-8888...
  return `+55${d}`;
}

// ---------------------------------------------------------------------------
// Elegibilidade
// ---------------------------------------------------------------------------

export type RecoveryCandidate = {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  /** profiles.professional_status ("medico", "interno"...). */
  professionalStatus: string | null;
  isAdmin: boolean;
  /** Assinatura ativa/trialing/past_due ou compra avulsa vigente. */
  isPaying: boolean;
  /** Já teve cortesia (ativa ou vencida). Cortesias ficam fora da recuperação. */
  hasCourtesy: boolean;
  /** Já pagou alguma vez (assinatura antiga ou compra avulsa vencida). */
  everPaid: boolean;
  trialEndsAt: string | null;
};

export type IneligibleReason =
  | "admin"
  | "paying"
  | "courtesy"
  | "not_doctor"
  | "no_email"
  | "no_phone"
  | "skip_list"
  | "no_trial"
  | "trial_active"
  | "trial_too_recent"
  | "trial_too_old"
  | "opted_out";

export const INELIGIBLE_LABEL: Record<IneligibleReason, string> = {
  admin: "Administrador",
  paying: "Assinante ativo",
  courtesy: "Cortesia",
  not_doctor: "Não declarado médico",
  no_email: "Sem e-mail",
  no_phone: "Sem celular válido",
  skip_list: "Conta de teste",
  no_trial: "Nunca fez o teste",
  trial_active: "Teste em andamento",
  trial_too_recent: "Teste acabou há menos de 24 h",
  trial_too_old: "Teste acabou há mais de 1 ano",
  opted_out: "Pediu para sair",
};

export type Classification =
  | { eligible: true; segment: RecoverySegment; phoneE164: string }
  | { eligible: false; reason: IneligibleReason };

const isTestEmail = (email: string) => /@(example\.(com|org|net)|teste?\.com)$/i.test(email);
export const normalizeEmail = (email: string | null | undefined) => (email ?? "").trim().toLowerCase();

const toMs = (now: Date | number | undefined) =>
  now === undefined ? Date.now() : typeof now === "number" ? now : now.getTime();

/** Quem pode entrar na cadência agora. A ordem das checagens define o motivo mostrado no painel. */
export function classifyCandidate(
  c: RecoveryCandidate,
  opts: { optedOutPhones?: Set<string>; now?: Date | number } = {},
): Classification {
  const now = toMs(opts.now);
  const email = normalizeEmail(c.email);
  if (c.isAdmin) return { eligible: false, reason: "admin" };
  if (c.isPaying) return { eligible: false, reason: "paying" };
  if (c.hasCourtesy) return { eligible: false, reason: "courtesy" };
  if ((c.professionalStatus ?? "").trim().toLowerCase() !== "medico") return { eligible: false, reason: "not_doctor" };
  if (!email || !email.includes("@")) return { eligible: false, reason: "no_email" };
  if (isTestEmail(email) || WA_SKIP_EMAILS.has(email)) return { eligible: false, reason: "skip_list" };
  const phoneE164 = normalizeBrMobile(c.phone);
  if (!phoneE164) return { eligible: false, reason: "no_phone" };
  if (opts.optedOutPhones?.has(phoneE164)) return { eligible: false, reason: "opted_out" };

  if (c.everPaid) return { eligible: true, segment: "ex_subscriber", phoneE164 };

  const end = c.trialEndsAt ? Date.parse(c.trialEndsAt) : NaN;
  if (!Number.isFinite(end)) return { eligible: false, reason: "no_trial" };
  if (end > now) return { eligible: false, reason: "trial_active" };
  if (now - end < MIN_HOURS_AFTER_TRIAL_END * HOUR) return { eligible: false, reason: "trial_too_recent" };
  if (now - end > MAX_DAYS_AFTER_TRIAL_END * DAY) return { eligible: false, reason: "trial_too_old" };
  return { eligible: true, segment: "trial_expired", phoneE164 };
}

// ---------------------------------------------------------------------------
// Horário de envio
// ---------------------------------------------------------------------------

export function isWithinSendWindow(now: Date | number = Date.now()): boolean {
  const local = new Date(toMs(now) + SEND_WINDOW.utcOffsetHours * HOUR);
  const hour = local.getUTCHours();
  const weekday = local.getUTCDay();
  if (weekday === 0 && !SEND_WINDOW.sunday) return false;
  return hour >= SEND_WINDOW.fromHour && hour < SEND_WINDOW.toHour;
}

/** Início do dia em Fortaleza (para contar o limite diário de novos contatos). */
export function localDayStart(now: Date | number = Date.now()): number {
  const t = toMs(now);
  const offset = SEND_WINDOW.utcOffsetHours * HOUR;
  const local = t + offset;
  return local - (local % DAY) - offset;
}

// ---------------------------------------------------------------------------
// Cadência
// ---------------------------------------------------------------------------

/**
 * active    = na cadência, aguardando a próxima etapa
 * replied   = respondeu: sai da automação e vai para conversa manual
 * converted = virou assinante
 * opted_out = pediu para sair (nunca mais recebe)
 * finished  = recebeu as 3 etapas sem responder
 * failed    = número não recebe WhatsApp / erro permanente
 * paused    = pausado à mão no painel
 */
export type ContactStatus = "active" | "replied" | "converted" | "opted_out" | "finished" | "failed" | "paused";
export const CONTACT_STATUSES: ContactStatus[] = ["active", "replied", "converted", "opted_out", "finished", "failed", "paused"];

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  active: "Em cadência",
  replied: "Respondeu",
  converted: "Converteu",
  opted_out: "Pediu para sair",
  finished: "Cadência concluída",
  failed: "Falhou",
  paused: "Pausado",
};

export type RecoveryContact = {
  id: string;
  user_id: string;
  phone_e164: string;
  segment: RecoverySegment;
  status: ContactStatus;
  /** Última etapa enviada (0 = nenhuma). */
  last_step: number;
  last_sent_at: string | null;
  entered_at: string;
};

/** Próxima etapa devida para um contato (null = nada agora). */
export function nextStepDue(contact: RecoveryContact, now: Date | number = Date.now()): WaStep | null {
  if (contact.status !== "active") return null;
  const next = (contact.last_step + 1) as WaStep;
  if (!WA_STEPS.includes(next)) return null;
  if (next === 1) return 1;
  if (!contact.last_sent_at) return null;
  const elapsed = toMs(now) - Date.parse(contact.last_sent_at);
  return elapsed >= WA_STEP_DELAY_DAYS[next] * DAY ? next : null;
}

export type RunPlan = {
  /** Novos contatos a criar (e já recebem a etapa 1). */
  enroll: { userId: string; segment: RecoverySegment; phoneE164: string }[];
  /** Contatos existentes que recebem a próxima etapa. */
  send: { contactId: string; step: WaStep }[];
  /** Contatos que mudam de status sem enviar nada. */
  close: { contactId: string; status: ContactStatus }[];
};

/**
 * O que fazer numa rodada. Fora do horário só fecha (conversões/concluídos), não envia.
 * Quem virou pagante para na hora; quem recebeu a etapa 3 há mais de 4 dias vira "finished".
 */
export function planRecoveryRun(input: {
  candidates: RecoveryCandidate[];
  contacts: RecoveryContact[];
  optedOutPhones: Set<string>;
  /** Novos contatos já criados hoje (dia de Fortaleza). */
  enrolledToday: number;
  dailyNewCap?: number;
  now?: Date | number;
}): RunPlan {
  const now = toMs(input.now);
  const cap = Math.max(0, input.dailyNewCap ?? DEFAULT_DAILY_NEW_CAP);
  const inWindow = isWithinSendWindow(now);
  const byUser = new Map(input.candidates.map((c) => [c.userId, c]));
  const contactByUser = new Map(input.contacts.map((c) => [c.user_id, c]));
  const contactPhones = new Set(input.contacts.map((c) => c.phone_e164));
  const plan: RunPlan = { enroll: [], send: [], close: [] };

  for (const contact of input.contacts) {
    const cand = byUser.get(contact.user_id);
    const open = contact.status === "active" || contact.status === "paused" || contact.status === "replied";
    if (open && cand?.isPaying) {
      plan.close.push({ contactId: contact.id, status: "converted" });
      continue;
    }
    if (contact.status !== "active") continue;
    if (input.optedOutPhones.has(contact.phone_e164)) {
      plan.close.push({ contactId: contact.id, status: "opted_out" });
      continue;
    }
    if (contact.last_step >= WA_STEPS.length) {
      const last = contact.last_sent_at ? Date.parse(contact.last_sent_at) : now;
      if (now - last >= WA_STEP_DELAY_DAYS[3] * DAY) plan.close.push({ contactId: contact.id, status: "finished" });
      continue;
    }
    if (!inWindow) continue;
    const step = nextStepDue(contact, now);
    if (step) plan.send.push({ contactId: contact.id, step });
  }

  if (!inWindow) return plan;

  let room = Math.max(0, cap - input.enrolledToday);
  const seenPhones = new Set<string>();
  for (const cand of input.candidates) {
    if (room <= 0) break;
    if (contactByUser.has(cand.userId)) continue; // cada pessoa entra uma única vez
    const cls = classifyCandidate(cand, { optedOutPhones: input.optedOutPhones, now });
    if (!cls.eligible) continue;
    if (contactPhones.has(cls.phoneE164) || seenPhones.has(cls.phoneE164)) continue; // mesmo celular em duas contas
    seenPhones.add(cls.phoneE164);
    plan.enroll.push({ userId: cand.userId, segment: cls.segment, phoneE164: cls.phoneE164 });
    room--;
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Modelos (templates aprovados na Meta via Bird)
// ---------------------------------------------------------------------------

/** Slug do modelo no Bird para cada segmento e etapa (categoria Marketing, pt_BR). */
export function templateSlug(segment: RecoverySegment, step: WaStep): string {
  return `medstation_recupera_${segment === "ex_subscriber" ? "ex" : "teste"}_${step}`;
}

/** Primeiro nome para {{1}} do modelo, com fallback neutro. */
export function firstName(fullName: string | null | undefined): string {
  const raw = (fullName ?? "").trim().replace(/^(dr|dra)\.?\s+/i, "");
  const first = raw.split(/\s+/)[0] ?? "";
  if (!first || first.length < 2 || /\d|@/.test(first)) return "doutor(a)";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Link do botão/variável: página de planos (ou /black durante a oferta) com UTM da etapa. */
export function recoveryLink(segment: RecoverySegment, step: WaStep, path = "/black"): string {
  const q = new URLSearchParams({
    utm_source: "whatsapp",
    utm_medium: "recovery",
    utm_campaign: `recupera_${segment}`,
    utm_content: `etapa_${step}`,
  });
  return `${SITE_URL}${path}?${q.toString()}`;
}

// ---------------------------------------------------------------------------
// Respostas e status de entrega (webhook)
// ---------------------------------------------------------------------------

const OPT_OUT = /^\s*(sair|parar|pare|stop|cancelar|descadastrar|remover|n[aã]o quero( mais)?( receber)?|n[aã]o tenho interesse)\s*[.!]*\s*$/i;

/** Resposta do contato: pedido de saída (palavra-chave sozinha ou botão "Não tenho interesse") ou conversa. */
export function inboundIntent(text: string | null | undefined, buttonPayload?: string | null): "opt_out" | "reply" {
  if (buttonPayload && /^(opt_?out|sair|nao_interesse)$/i.test(buttonPayload.trim())) return "opt_out";
  return OPT_OUT.test(text ?? "") ? "opt_out" : "reply";
}

export type MessageStatus = "sending" | "accepted" | "sent" | "delivered" | "read" | "failed";
const STATUS_RANK: Record<MessageStatus, number> = { sending: 0, accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5 };

/** Status de entrega nunca volta atrás (o "read" pode chegar antes do "delivered"). "failed" só vale antes de entregar. */
export function mergeMessageStatus(current: MessageStatus, incoming: string): MessageStatus {
  const next = (["accepted", "sent", "delivered", "read", "failed"] as const).find((s) => s === incoming.toLowerCase());
  if (!next) return current;
  if (next === "failed") return STATUS_RANK[current] >= STATUS_RANK.delivered && current !== "failed" ? current : "failed";
  if (current === "failed") return current;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

/** Erro permanente de destino (número sem WhatsApp, inválido) encerra o contato; os demais deixam tentar de novo. */
export function isPermanentFailure(errorCode: string | null | undefined): boolean {
  return /^(131026|131030|131051|1013|invalid_recipient|recipient_not_on_whatsapp|unsupported_recipient)$/i.test(
    (errorCode ?? "").trim(),
  );
}

// ---------------------------------------------------------------------------
// Funil para o painel
// ---------------------------------------------------------------------------

export type FunnelMessage = { contact_id: string; step: number; status: MessageStatus };

export function recoveryFunnel(contacts: Pick<RecoveryContact, "id" | "status">[], messages: FunnelMessage[]) {
  const byStatus = Object.fromEntries(CONTACT_STATUSES.map((s) => [s, 0])) as Record<ContactStatus, number>;
  for (const c of contacts) byStatus[c.status]++;
  const reached = new Set<string>();
  const read = new Set<string>();
  let sent = 0;
  let failed = 0;
  for (const m of messages) {
    if (m.status === "failed") failed++;
    else if (m.status !== "sending") sent++;
    if (m.status === "delivered" || m.status === "read") reached.add(m.contact_id);
    if (m.status === "read") read.add(m.contact_id);
  }
  const total = contacts.length;
  return {
    contacts: total,
    messagesSent: sent,
    messagesFailed: failed,
    delivered: reached.size,
    read: read.size,
    replied: byStatus.replied,
    converted: byStatus.converted,
    optedOut: byStatus.opted_out,
    byStatus,
    conversionRate: total ? byStatus.converted / total : 0,
  };
}
