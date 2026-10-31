// Troca do mensal para um plano anual à vista (anual comum ou Black) sem
// cobrança dupla. Regras puras, sem rede, para ficarem testáveis no vitest.

export type MonthlySubLite = {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd?: boolean;
};

export type MonthlyHandoff = {
  /** Mensais em dia: encerram no fim do período já pago (nada é devolvido nem cobrado de novo). */
  cancelAtPeriodEnd: string[];
  /** Mensais com cobrança em aberto: encerram na hora para não cobrar mais. */
  cancelNow: string[];
  /** O anual começa depois do último dia já pago do mensal. */
  accessFrom: string | null;
};

const PAID_UP = new Set(["active", "trialing"]);
const OWING = new Set(["past_due", "unpaid", "incomplete"]);

/** Compra anual à vista pode ser feita mesmo com mensal ativo; o mensal é encerrado depois. */
export function allowsPurchaseWithActiveSubscription(accessPeriod: string | null | undefined): boolean {
  return accessPeriod === "annual_12m";
}

export function planMonthlyHandoff(subs: MonthlySubLite[], now: Date = new Date()): MonthlyHandoff {
  const seen = new Set<string>();
  const cancelAtPeriodEnd: string[] = [];
  const cancelNow: string[] = [];
  let accessFrom: number | null = null;

  for (const sub of subs) {
    if (!sub?.id || seen.has(sub.id)) continue;
    seen.add(sub.id);
    if (OWING.has(sub.status)) {
      cancelNow.push(sub.id);
      continue;
    }
    if (!PAID_UP.has(sub.status)) continue;
    const end = sub.currentPeriodEnd ? Date.parse(sub.currentPeriodEnd) : NaN;
    if (!sub.cancelAtPeriodEnd) cancelAtPeriodEnd.push(sub.id);
    if (Number.isFinite(end) && end > now.getTime()) {
      accessFrom = accessFrom === null ? end : Math.max(accessFrom, end);
    }
  }

  return {
    cancelAtPeriodEnd,
    cancelNow,
    accessFrom: accessFrom === null ? null : new Date(accessFrom).toISOString(),
  };
}

/** O maior entre o fim do acesso avulso atual e o último dia pago do mensal. */
export function laterDate(a: string | null | undefined, b: string | null | undefined): string | null {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return null;
  if (!Number.isFinite(ta)) return new Date(tb).toISOString();
  if (!Number.isFinite(tb)) return new Date(ta).toISOString();
  return new Date(Math.max(ta, tb)).toISOString();
}
