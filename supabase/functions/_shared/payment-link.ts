/**
 * Regras puras de ligação pagamento ↔ conta (sem imports: testável no vitest).
 *
 * Lição do caso real: a médica pagou com um e-mail e tinha conta com outro.
 * O acesso era resolvido só pelo e-mail do cliente no Stripe, então qualquer
 * diferença de e-mail fazia a assinatura "vazar" (paga, mas sem acesso).
 */

export const normalizeEmail = (email: string | null | undefined) =>
  (email ?? "").trim().toLowerCase();

/**
 * Clientes do Stripe a consultar para uma conta: os achados pelo e-mail da
 * conta + os já ligados à conta (assinatura com user_id da conta). Sem
 * duplicados e sem vazios, preservando a ordem.
 */
export function collectCustomerIds(
  byEmail: Array<string | null | undefined>,
  linkedToAccount: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...byEmail, ...linkedToAccount]) {
    const clean = (id ?? "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export type PaymentLinkIssue = "sem_conta" | "conta_inexistente" | "email_diferente";

export type PaymentLinkRow = {
  /** user_id gravado no pagamento (null = nenhuma conta ligada). */
  userId: string | null;
  /** e-mail da conta ligada; null quando a conta não existe mais. */
  accountEmail: string | null;
  /** e-mail do cliente no Stripe / informado no checkout. */
  paymentEmail: string | null;
};

/**
 * Classifica um pagamento ativo. null = ligado corretamente.
 * - sem_conta: pago e nenhuma conta ligada → ninguém recebe o acesso.
 * - conta_inexistente: ligado a uma conta que foi apagada.
 * - email_diferente: conta ligada, mas o e-mail não é o do pagamento
 *   (o acesso funciona pelo vínculo, mas convém o admin conferir).
 */
export function paymentLinkIssue(row: PaymentLinkRow): PaymentLinkIssue | null {
  if (!row.userId) return "sem_conta";
  if (!row.accountEmail) return "conta_inexistente";
  const pay = normalizeEmail(row.paymentEmail);
  if (pay && pay !== normalizeEmail(row.accountEmail)) return "email_diferente";
  return null;
}
