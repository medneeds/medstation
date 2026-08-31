// Compatibilidade: o plano anual agora é um caso do catálogo genérico de
// compras avulsas em `one-time-purchase.ts`. Este arquivo mantém a API antiga.

import {
  ANNUAL_PLAN_SLUG,
  ONE_TIME_PLANS,
  buildOneTimeLineItem,
  computeAccessWindow,
  oneTimePaymentMethodTypes,
  shouldGrantOneTimeAccess,
  type AccessWindow,
  type MinimalCheckoutSession,
  type OneTimeLineItem,
} from "./one-time-purchase.ts";

export {
  ANNUAL_PLAN_SLUG,
  isAnnualPlan,
  isPixUnavailableError,
  type MinimalCheckoutSession,
} from "./one-time-purchase.ts";

const ANNUAL = ONE_TIME_PLANS[ANNUAL_PLAN_SLUG];

export const ANNUAL_AMOUNT_CENTS = ANNUAL.amountCents;
export const ANNUAL_CURRENCY = ANNUAL.currency;
export const ANNUAL_ACCESS_DAYS = ANNUAL.accessDays;
export const ANNUAL_PRODUCT_ID = ANNUAL.productId;
export const ANNUAL_PURPOSE = ANNUAL.purpose;

export type AnnualLineItem = OneTimeLineItem;

export function buildAnnualLineItem(oneTimePriceId?: string | null): AnnualLineItem {
  return buildOneTimeLineItem(ANNUAL, oneTimePriceId);
}

export function annualPaymentMethodTypes(pixEnabled: boolean): string[] {
  return oneTimePaymentMethodTypes(ANNUAL, pixEnabled);
}

export function shouldGrantAnnualAccess(
  eventType: string,
  session: MinimalCheckoutSession,
): boolean {
  return shouldGrantOneTimeAccess(eventType, session);
}

export type { AccessWindow };

export function computeAnnualAccessWindow(
  paidAt: Date,
  currentAccessEnd?: string | Date | null,
): AccessWindow {
  return computeAccessWindow(paidAt, currentAccessEnd, "annual_12m");
}
