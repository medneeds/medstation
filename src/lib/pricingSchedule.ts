// Calendário de preços exibido no site.
// Espelho de supabase/functions/_shared/pricing-schedule.ts — um teste mantém
// os dois iguais. Quem decide o valor cobrado é sempre o servidor.
//
// - Black MedStation: 1 a 30 de novembro de 2026 (Brasília), só anual,
//   R$ 399,90 à vista, sem o bônus Arsenal Med.
// - A partir de 1º de dezembro de 2026: mensal R$ 99,90 e anual R$ 999,90.

export const BLACK_OFFER = {
  slug: "black_anual_2026",
  startsAt: "2026-11-01T03:00:00.000Z",
  endsAt: "2026-12-01T03:00:00.000Z",
  amountCents: 39990,
  anchorCents: 99990,
} as const;

export const FULL_PRICE_STARTS_AT = "2026-12-01T03:00:00.000Z";

export const PRICE_TABLE = {
  launch: { monthlyCents: 4990, yearlyCents: 49990 },
  full: { monthlyCents: 9990, yearlyCents: 99990 },
} as const;

export type PricePhase = keyof typeof PRICE_TABLE;
export type BlackStatus = "upcoming" | "active" | "ended";

function ms(value: Date | number): number {
  return typeof value === "number" ? value : value.getTime();
}

export function pricePhase(now: Date | number = Date.now()): PricePhase {
  return ms(now) >= Date.parse(FULL_PRICE_STARTS_AT) ? "full" : "launch";
}

export function currentPriceCents(now: Date | number = Date.now()) {
  return PRICE_TABLE[pricePhase(now)];
}

export function blackStatus(now: Date | number = Date.now()): BlackStatus {
  const t = ms(now);
  if (t < Date.parse(BLACK_OFFER.startsAt)) return "upcoming";
  if (t >= Date.parse(BLACK_OFFER.endsAt)) return "ended";
  return "active";
}

export function isBlackActive(now: Date | number = Date.now()): boolean {
  return blackStatus(now) === "active";
}

/** Tempo que falta até um instante, em partes para o contador. */
export function timeLeft(targetIso: string, now: Date | number = Date.now()) {
  const diff = Math.max(0, Date.parse(targetIso) - ms(now));
  const totalMinutes = Math.floor(diff / 60000);
  return {
    done: diff === 0,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    seconds: Math.floor((diff % 60000) / 1000),
  };
}
