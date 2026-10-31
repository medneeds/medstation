// Lembrete do boleto em aberto: um no dia seguinte e outro no último dia.
// Regras puras (sem rede) para ficarem testáveis no vitest.

export type BoletoReminderStage = "day_after" | "last_day";

const HOUR = 3_600_000;
/** Lembrete "dia seguinte": pelo menos 20 h depois de gerar o boleto. */
export const DAY_AFTER_MIN_HOURS = 20;
/** Lembrete "último dia": nas últimas 18 h antes de vencer (vence às 23h59 de Brasília). */
export const LAST_DAY_WINDOW_HOURS = 18;
/** Só envia entre 8h e 21h de Brasília, para não acordar ninguém. */
export const SEND_FROM_HOUR = 8;
export const SEND_UNTIL_HOUR = 21;

function brasiliaHour(now: Date): number {
  // Brasil sem horário de verão: UTC-3 fixo.
  return (now.getUTCHours() + 21) % 24;
}

export function isSendingHour(now: Date): boolean {
  const h = brasiliaHour(now);
  return h >= SEND_FROM_HOUR && h < SEND_UNTIL_HOUR;
}

export function boletoReminderStage(input: {
  createdAt: string;
  expiresAt: string | null;
  sent: string[];
  now?: Date;
}): BoletoReminderStage | null {
  const now = input.now ?? new Date();
  if (!input.expiresAt) return null;
  const expires = Date.parse(input.expiresAt);
  const created = Date.parse(input.createdAt);
  if (!Number.isFinite(expires) || !Number.isFinite(created)) return null;
  if (now.getTime() >= expires) return null;
  if (!isSendingHour(now)) return null;

  const sent = new Set(input.sent ?? []);
  const hoursLeft = (expires - now.getTime()) / HOUR;
  const hoursSince = (now.getTime() - created) / HOUR;

  if (hoursLeft <= LAST_DAY_WINDOW_HOURS) {
    return sent.has("last_day") ? null : "last_day";
  }
  if (hoursSince >= DAY_AFTER_MIN_HOURS && !sent.has("day_after") && !sent.has("last_day")) {
    return "day_after";
  }
  return null;
}
