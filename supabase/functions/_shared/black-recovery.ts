// Black MedStation: quem começou a compra e não concluiu.
// Regra pura (sem rede, sem imports) usada pelo painel admin-black-dashboard e
// pelo envio automático black-recovery-reminders (de hora em hora). Testável no vitest.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type RecoveryStep = "1h" | "24h";
export const RECOVERY_STEPS: RecoveryStep[] = ["1h", "24h"];

/** Janelas contadas a partir da última tentativa (clique em assinar ou pagamento aberto). */
export const RECOVERY_WINDOWS: Record<RecoveryStep, { fromHours: number; toHours: number }> = {
  "1h": { fromHours: 1, toHours: 3 },
  "24h": { fromHours: 24, toHours: 30 },
};

/** O link de retomada do Stripe vale 30 dias depois que a sessão expira; usamos menos, por segurança. */
export const RECOVERY_URL_MAX_AGE_DAYS = 29;

/** Nunca recebem os lembretes automáticos (o dono testa a página com o próprio e-mail). */
export const RECOVERY_SKIP_EMAILS = new Set(["arturaugustosb@gmail.com"]);

export const BLACK_PAGE_URL = "https://medstation-ai.com.br/black";

export type RecoveryLead = {
  email: string;
  phone?: string | null;
  source: string;
  created_at: string;
};

export type RecoveryAttempt = {
  id: string;
  email: string | null;
  status: string;
  payment_method?: string | null;
  created_at: string;
  recovery_url?: string | null;
  recovery_status?: string | null;
  boleto_expires_at?: string | null;
};

export type AbandonedCheckout<A extends RecoveryAttempt = RecoveryAttempt> = {
  email: string;
  /** Última tentativa: o mais recente entre o clique em assinar e o pagamento aberto. */
  lastAt: string | null;
  /** Tentativa de pagamento mais recente não paga (null = só clicou em assinar). */
  attempt: A | null;
};

export const normalizeEmail = (email: string | null | undefined) => (email ?? "").trim().toLowerCase();

export const isTestEmail = (email: string | null | undefined) =>
  !email || /@(example\.(com|org|net)|teste?\.com)$/i.test(email.trim());

function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/**
 * Começou e não pagou: clicou em assinar (lead black_checkout) ou abriu o
 * pagamento, sem compra paga da Black e sem boleto ainda dentro do prazo.
 * Ordenado do mais recente para o mais antigo.
 */
export function abandonedCheckouts<A extends RecoveryAttempt>(input: {
  leads: RecoveryLead[];
  attempts: A[];
  now?: Date | number;
}): AbandonedCheckout<A>[] {
  const now = input.now === undefined ? Date.now() : typeof input.now === "number" ? input.now : input.now.getTime();

  const paid = new Set<string>();
  const openBoleto = new Set<string>();
  const latestAttempt = new Map<string, A>();
  for (const a of input.attempts) {
    const email = normalizeEmail(a.email);
    if (!email || isTestEmail(email)) continue;
    if (a.status === "paid") {
      paid.add(email);
      continue;
    }
    if (
      a.status === "pending" && a.payment_method === "boleto" && a.boleto_expires_at &&
      Date.parse(a.boleto_expires_at) > now
    ) openBoleto.add(email);
    const current = latestAttempt.get(email);
    if (!current || Date.parse(a.created_at) > Date.parse(current.created_at)) latestAttempt.set(email, a);
  }

  const lastClick = new Map<string, string>();
  for (const l of input.leads) {
    if (l.source !== "black_checkout") continue;
    const email = normalizeEmail(l.email);
    if (!email || isTestEmail(email)) continue;
    lastClick.set(email, later(lastClick.get(email) ?? null, l.created_at) as string);
  }

  const emails = new Set<string>([...lastClick.keys(), ...latestAttempt.keys()]);
  return [...emails]
    .filter((email) => !paid.has(email) && !openBoleto.has(email))
    .map((email) => {
      const attempt = latestAttempt.get(email) ?? null;
      return { email, attempt, lastAt: later(lastClick.get(email) ?? null, attempt?.created_at ?? null) };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}

/** Qual lembrete cabe agora, só pela janela de tempo (null = nenhum). */
export function recoveryStepDue(lastAt: string | null, now: Date | number, sent: Iterable<string> = []): RecoveryStep | null {
  if (!lastAt) return null;
  const t = typeof now === "number" ? now : now.getTime();
  const last = Date.parse(lastAt);
  if (!Number.isFinite(last)) return null;
  const hours = (t - last) / HOUR;
  const already = new Set(sent);
  for (const step of RECOVERY_STEPS) {
    const w = RECOVERY_WINDOWS[step];
    if (hours >= w.fromHours && hours < w.toHours) return already.has(step) ? null : step;
  }
  return null;
}

/** Link para continuar: o de retomada do Stripe se existir e ainda valer; senão a página da Black com UTM. */
export function recoveryContinueUrl(attempt: RecoveryAttempt | null, step: RecoveryStep, now: Date | number): string {
  const t = typeof now === "number" ? now : now.getTime();
  const url = attempt?.recovery_url?.trim();
  if (
    attempt && url && /^https:\/\/checkout\.stripe\.com\//.test(url) && attempt.recovery_status !== "recovered" &&
    t - Date.parse(attempt.created_at) < RECOVERY_URL_MAX_AGE_DAYS * DAY
  ) return url;
  const q = new URLSearchParams({
    utm_source: "email",
    utm_medium: "recovery",
    utm_campaign: "black_2026",
    utm_content: step,
  });
  return `${BLACK_PAGE_URL}?${q.toString()}`;
}

export type RecoverySend<A extends RecoveryAttempt = RecoveryAttempt> = {
  email: string;
  step: RecoveryStep;
  continueUrl: string;
  attempt: A | null;
};

/**
 * Quem recebe qual e-mail agora. Nunca durante fora da oferta, nunca para quem
 * já comprou (qualquer anual pago ou assinatura ativa), nunca para descadastrados
 * ou bloqueados, nunca duas vezes a mesma etapa, nunca para endereços de teste.
 */
export function planRecoveryEmails<A extends RecoveryAttempt>(input: {
  abandoned: AbandonedCheckout<A>[];
  offer: { startsAt: string; endsAt: string };
  /** E-mail -> etapas já enviadas (tabela black_recovery_emails). */
  sent: Map<string, Iterable<string>>;
  suppressed: Set<string>;
  purchased: Set<string>;
  now?: Date | number;
}): RecoverySend<A>[] {
  const now = input.now === undefined ? Date.now() : typeof input.now === "number" ? input.now : input.now.getTime();
  if (now < Date.parse(input.offer.startsAt) || now >= Date.parse(input.offer.endsAt)) return [];
  const out: RecoverySend<A>[] = [];
  for (const entry of input.abandoned) {
    const email = normalizeEmail(entry.email);
    if (!email || isTestEmail(email) || RECOVERY_SKIP_EMAILS.has(email)) continue;
    if (input.suppressed.has(email) || input.purchased.has(email)) continue;
    const step = recoveryStepDue(entry.lastAt, now, input.sent.get(email) ?? []);
    if (!step) continue;
    out.push({ email, step, attempt: entry.attempt, continueUrl: recoveryContinueUrl(entry.attempt, step, now) });
  }
  return out;
}
