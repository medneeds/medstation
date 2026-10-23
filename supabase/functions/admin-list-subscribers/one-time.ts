// Compras avulsas (plano anual e Pix 30 dias) não são assinaturas recorrentes
// no Stripe, mas dão acesso pago. O painel precisa contá-las como pagantes.

export interface OneTimePurchaseRow {
  user_id: string | null;
  email: string | null;
  stripe_customer_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  access_period: string | null;
  paid_at: string | null;
  access_end: string | null;
}

export interface OneTimeSummary {
  interval: "year" | "month";
  monthlyAmountCents: number;
  currency: string | null;
  endDate: string | null;
  startedAt: string | null;
  isAnnual: boolean;
}

/** Equivalente mensal da compra: anual dividido por 12; Pix 30 dias conta inteiro. */
export function oneTimeMonthlyCents(row: Pick<OneTimePurchaseRow, "amount_cents" | "access_period">): number {
  const amount = row.amount_cents ?? 0;
  if (amount <= 0) return 0;
  return row.access_period === "annual_12m" ? Math.round(amount / 12) : amount;
}

/**
 * Resume as compras avulsas ATIVAS de uma pessoa (pagas e com acesso vigente).
 * Se houver anual vigente, a pessoa é anual; a receita mensal soma só a compra
 * que está valendo agora (a de fim mais próximo ainda vigente), para não contar
 * duas vezes recargas emendadas.
 */
export function summarizeOneTime(rows: OneTimePurchaseRow[], now = Date.now()): OneTimeSummary | null {
  const active = rows
    .filter((r) => r.access_end && new Date(r.access_end).getTime() > now)
    .sort((a, b) => new Date(a.access_end!).getTime() - new Date(b.access_end!).getTime());
  if (!active.length) return null;

  const current = active.find((r) => !r.paid_at || new Date(r.paid_at).getTime() <= now) ?? active[0];
  const isAnnual = active.some((r) => r.access_period === "annual_12m");
  const latestEnd = active[active.length - 1].access_end;

  return {
    interval: isAnnual ? "year" : "month",
    monthlyAmountCents: oneTimeMonthlyCents(current),
    currency: current.currency ?? null,
    endDate: latestEnd,
    startedAt: current.paid_at ?? null,
    isAnnual,
  };
}
