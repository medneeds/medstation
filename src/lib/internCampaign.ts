/** Campanha de cortesia para internos de medicina. */
export const INTERN_CAMPAIGN = {
  id: "internos-30",
  spots: 30,
  courtesyDays: 30,
  /** Link do grupo de WhatsApp para onde o interno é levado após a inscrição. */
  whatsappGroupUrl: "https://chat.whatsapp.com/LQu9cCmdCagI0swlYUjInY",
} as const;

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const MEDICAL_PERIODS = ["9º período", "10º período", "11º período", "12º período", "Outro"];

/** Posições 1..30 garantem a cortesia; o restante vai para a lista de espera. */
export function isGuaranteedSpot(position: number): boolean {
  return position >= 1 && position <= INTERN_CAMPAIGN.spots;
}

export function graduationYearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  return Array.from({ length: 5 }, (_, i) => y + i);
}

export type CourtesyPlan =
  | { action: "insert"; expiresAt: string }
  | { action: "update"; expiresAt: string }
  | { action: "keep"; expiresAt: string | null };

/**
 * Decide como aplicar os 30 dias quando o interno já pode ter outra cortesia
 * (ex.: teste antigo). Cada pessoa tem um único registro de cortesia, então
 * atualizamos o existente e nunca encurtamos um acesso maior que já exista.
 */
export function planInternCourtesy(
  existing: { expires_at: string | null } | null,
  now = new Date(),
): CourtesyPlan {
  const target = new Date(now.getTime() + INTERN_CAMPAIGN.courtesyDays * 86400000);
  if (!existing) return { action: "insert", expiresAt: target.toISOString() };
  if (existing.expires_at === null) return { action: "keep", expiresAt: null };
  const current = new Date(existing.expires_at);
  if (current.getTime() >= target.getTime()) return { action: "keep", expiresAt: existing.expires_at };
  return { action: "update", expiresAt: target.toISOString() };
}
