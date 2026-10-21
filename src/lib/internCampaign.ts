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

/** Vagas garantidas restantes, dado o total de inscritos. */
export function spotsLeft(taken: number): number {
  return Math.max(0, INTERN_CAMPAIGN.spots - taken);
}

/** Quando as 30 vagas estão preenchidas, a página passa a inscrever na lista de espera. */
export function isCampaignFull(taken: number): boolean {
  return taken >= INTERN_CAMPAIGN.spots;
}

/** Posição na lista de espera (31º inscrito = 1º da espera); null para vaga garantida. */
export function waitlistPosition(position: number): number | null {
  return isGuaranteedSpot(position) ? null : position - INTERN_CAMPAIGN.spots;
}

export function graduationYearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  return Array.from({ length: 5 }, (_, i) => y + i);
}
