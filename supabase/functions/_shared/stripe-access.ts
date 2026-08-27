/**
 * Pure helpers for Stripe entitlement resolution.
 *
 * This module intentionally has NO imports (no Stripe SDK, no Supabase client)
 * so it can be unit tested from the frontend test runner (Vitest) as well as
 * used inside Deno edge functions.
 */

export type MinimalPrice = {
  product?: string | { id?: string } | null;
};

export type MinimalSubscriptionItem = {
  /** Stripe API 2025-08-27+ exposes the period end on the subscription ITEM. */
  current_period_end?: number | null;
  price?: MinimalPrice | null;
};

export type MinimalSubscription = {
  status: string;
  /** Legacy top-level field (removed in recent API versions). */
  current_period_end?: number | null;
  items?: { data?: MinimalSubscriptionItem[] } | null;
};

export const VALID_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

/** Grace period, in days, we intend to give a past_due subscription. */
export const PAST_DUE_GRACE_DAYS = 7;

export function isValidSubscription(sub: MinimalSubscription): boolean {
  return VALID_SUBSCRIPTION_STATUSES.includes(sub.status);
}

/**
 * Resolves the current period end of a subscription, tolerating both the
 * legacy top-level field and the current per-item field.
 * Returns an ISO string or null.
 */
export function resolveSubscriptionEnd(sub: MinimalSubscription): string | null {
  const candidates: number[] = [];
  if (typeof sub.current_period_end === "number") candidates.push(sub.current_period_end);
  for (const item of sub.items?.data ?? []) {
    if (typeof item.current_period_end === "number") candidates.push(item.current_period_end);
  }
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates) * 1000).toISOString();
}

export function extractProductIds(sub: MinimalSubscription): string[] {
  const ids: string[] = [];
  for (const item of sub.items?.data ?? []) {
    const product = item.price?.product;
    const id = typeof product === "string" ? product : product?.id;
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export type SubscriptionSummary = {
  hasHealthy: boolean;
  hasPastDue: boolean;
  productIds: string[];
  subscriptionEnd: string | null;
};

/**
 * Aggregates every valid subscription found across ALL Stripe customers that
 * share the user's email. Relying on a single customer (limit: 1) silently
 * locks out paying users whose email exists on more than one customer record.
 */
export function summarizeSubscriptions(subs: MinimalSubscription[]): SubscriptionSummary | null {
  const valid = subs.filter(isValidSubscription);
  if (!valid.length) return null;

  const productIds: string[] = [];
  let subscriptionEnd: string | null = null;
  let hasHealthy = false;
  let hasPastDue = false;

  for (const sub of valid) {
    if (sub.status === "active" || sub.status === "trialing") hasHealthy = true;
    if (sub.status === "past_due") hasPastDue = true;

    for (const id of extractProductIds(sub)) {
      if (!productIds.includes(id)) productIds.push(id);
    }

    const end = resolveSubscriptionEnd(sub);
    if (end && (!subscriptionEnd || end > subscriptionEnd)) subscriptionEnd = end;
  }

  return { hasHealthy, hasPastDue, productIds, subscriptionEnd };
}

/**
 * TODO (needs product decision + persisted billing data): apply an explicit
 * 7-day grace period for past_due subscriptions instead of granting access
 * indefinitely. Doing it correctly requires knowing WHEN the subscription
 * entered past_due, which is only reliably available through a Stripe webhook
 * (`customer.subscription.updated`) persisted in our own database. Until that
 * exists, current behaviour is preserved: past_due keeps platform access.
 */
export function pastDueGraceDeadline(enteredPastDueIso: string | null): string | null {
  if (!enteredPastDueIso) return null;
  const base = new Date(enteredPastDueIso).getTime();
  if (Number.isNaN(base)) return null;
  return new Date(base + PAST_DUE_GRACE_DAYS * 86400000).toISOString();
}
