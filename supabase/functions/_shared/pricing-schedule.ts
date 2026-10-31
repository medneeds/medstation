// Calendário de preços da MedStation (fonte única no servidor).
// Espelhado em src/lib/pricingSchedule.ts — um teste mantém os dois iguais.
//
// Regras (Artur, out/2026):
// - Black MedStation: 1 a 30 de novembro de 2026 (horário de Brasília), só no
//   plano anual, R$ 399,90 à vista, SEM o bônus Arsenal Med.
// - A partir de 1º de dezembro de 2026 (Brasília) o preço de lançamento acaba:
//   mensal R$ 99,90 e anual R$ 999,90. Assinaturas já ativas mantêm o valor.
//
// Brasília é UTC-3 o ano todo (sem horário de verão desde 2019).

export const BLACK_OFFER = {
  slug: "black_anual_2026",
  startsAt: "2026-11-01T03:00:00.000Z",
  endsAt: "2026-12-01T03:00:00.000Z",
  amountCents: 39990,
  /** Preço do anual depois da Black, usado como ancoragem na página. */
  anchorCents: 99990,
} as const;

/** Momento em que o preço de lançamento acaba para novas assinaturas. */
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
