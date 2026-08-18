// Camada única de conversão: dispara o evento de compra para todos os
// destinos de mensuração (Meta Pixel + PostHog) a partir de um único ponto,
// a página de agradecimento (/obrigado). Evita disparo duplicado por reload.

import { trackSubscriptionCompleted } from "@/lib/analytics";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type PurchaseConversion = {
  /** Identificador único da compra (session_id do Stripe ou id da assinatura) */
  transactionId?: string | null;
  value?: number | null;
  currency?: string | null;
  plan?: string | null;
  extra?: Record<string, unknown>;
};

const FIRED_KEY = "ms_purchase_fired";

function alreadyFired(id: string): boolean {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(id)) return true;
    localStorage.setItem(FIRED_KEY, JSON.stringify([...list.slice(-19), id]));
    return false;
  } catch {
    return false;
  }
}

export function trackPurchaseConversion(data: PurchaseConversion) {
  const id = data.transactionId || `purchase_${Date.now()}`;
  if (alreadyFired(id)) return;

  const value = typeof data.value === "number" ? data.value : undefined;
  const currency = (data.currency || "BRL").toUpperCase();

  // Meta Pixel
  try {
    window.fbq?.(
      "track",
      "Purchase",
      { value: value ?? 0, currency, content_name: data.plan ?? undefined },
      { eventID: id },
    );
    window.fbq?.("track", "Subscribe", { value: value ?? 0, currency }, { eventID: `sub_${id}` });
  } catch {
    /* noop */
  }

  // PostHog / funil interno
  trackSubscriptionCompleted({
    transaction_id: id,
    amount_brl: value,
    currency,
    plan: data.plan ?? undefined,
    ...(data.extra ?? {}),
  });
}
