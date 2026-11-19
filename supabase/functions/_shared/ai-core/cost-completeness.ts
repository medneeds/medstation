/** Distinguish unknown costs from genuinely free AI usage.
 * Historical GPT-6 Astra calls were incorrectly recorded as $0 before pricing lookup.
 * Never replace unknown values with invented commercial tariffs.
 */
export interface CostCompletenessRow {
  model: string | null;
  cost_usd: number | null;
  metadata: Record<string, unknown> | null;
}
export function isUnpricedAICall(row: CostCompletenessRow): boolean {
  if (row.metadata?.cost_estimate_missing === true) return true;
  if (row.cost_usd === null) return true;
  return row.model === "openai/gpt-6-astra" && Number(row.cost_usd) === 0;
}
