// Analytics: PostHog + tabela local `page_views`.
import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

const TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
const REGION = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string | undefined) ?? "eu";
const HOST = REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";

let initialized = false;
let bootedSessionId: string | null = null;

function getSessionId(): string {
  if (bootedSessionId) return bootedSessionId;
  try {
    let sid = localStorage.getItem("ms_sid");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("ms_sid", sid);
    }
    bootedSessionId = sid;
    return sid;
  } catch {
    bootedSessionId = crypto.randomUUID();
    return bootedSessionId;
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  if (TOKEN) {
    try {
      posthog.init(TOKEN, {
        api_host: HOST,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
    } catch (e) {
      console.warn("[analytics] posthog init failed", e);
    }
  }
}

const LANDING_PATHS = new Set(["/", "/precos", "/pricing", "/planos"]);

export async function trackPageView(path: string, referrer?: string) {
  if (initialized && TOKEN) {
    try {
      posthog.capture("$pageview", { $current_url: window.location.href });
    } catch {
      /* noop */
    }
  }

  if (!LANDING_PATHS.has(path)) return;
  try {
    await supabase.from("page_views").insert({
      path,
      referrer: referrer ?? document.referrer ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
      device: detectDevice(),
    });
  } catch (e) {
    console.debug("[analytics] page_view insert failed", e);
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!initialized || !TOKEN) return;
  try {
    posthog.capture(name, props);
  } catch {
    /* noop */
  }
}

/**
 * Product lifecycle events that sit between acquisition and checkout.
 * `onceKey` prevents accidental duplicate milestones on rerender/reload on the
 * same browser while still allowing ordinary repeatable events such as paywall views.
 */
export function trackLifecycleEvent(
  name: "lead_created" | "signup_started" | "signup_completed" | "trial_started" | "first_login" |
    "trial_welcome_viewed" | "first_value_action" | "trial_expired" | "paywall_viewed",
  props: Record<string, unknown> = {},
  onceKey?: string,
) {
  if (onceKey) {
    try {
      const key = `ms_event:${name}:${onceKey}`;
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
    } catch {
      /* analytics dedupe is best-effort */
    }
  }
  trackEvent(name, { ...utmContext(), ...props });
}

/* -------------------------------------------------------------------------
 * Funil de conversão e atribuição.
 * ---------------------------------------------------------------------- */

const ATTRIBUTION_KEY = "ms_funnel_attribution";

export type FunnelAttribution = {
  cta?: string;
  cta_section?: string;
  cta_page?: string;
  plan?: string | null;
  billing_period?: string | null;
  clicked_at?: string;
};

function utmContext(): Record<string, unknown> {
  try {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, unknown> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = p.get(key);
      if (v) out[key] = v;
    }
    if (document.referrer) out.referrer = document.referrer;
    return out;
  } catch {
    return {};
  }
}

function saveAttribution(attr: FunnelAttribution) {
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
  } catch {
    /* noop */
  }
}

export function getFunnelAttribution(): FunnelAttribution {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY) ?? localStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as FunnelAttribution) : {};
  } catch {
    return {};
  }
}

export function clearFunnelAttribution() {
  try {
    sessionStorage.removeItem(ATTRIBUTION_KEY);
    localStorage.removeItem(ATTRIBUTION_KEY);
  } catch {
    /* noop */
  }
}

export type CtaClickMeta = {
  cta: string;
  section?: string;
  plan?: string | null;
  billing_period?: "monthly" | "yearly" | null;
  destination?: string;
  [key: string]: unknown;
};

export function trackCtaClick(meta: CtaClickMeta) {
  const attribution: FunnelAttribution = {
    cta: meta.cta,
    cta_section: meta.section,
    cta_page: typeof window !== "undefined" ? window.location.pathname : undefined,
    plan: meta.plan ?? null,
    billing_period: meta.billing_period ?? null,
    clicked_at: new Date().toISOString(),
  };
  saveAttribution(attribution);
  trackEvent("cta_click", { ...utmContext(), ...attribution, destination: meta.destination, ...meta });
}

export type CheckoutStartedMeta = {
  plan?: string | null;
  product?: string | null;
  billing_period?: "monthly" | "yearly" | null;
  price_brl?: number | null;
  origin: string;
  auth_state?: "guest" | "authenticated";
  coupon?: string | null;
  [key: string]: unknown;
};

export function trackCheckoutStarted(meta: CheckoutStartedMeta) {
  const attribution = getFunnelAttribution();
  saveAttribution({
    ...attribution,
    plan: meta.plan ?? attribution.plan ?? null,
    billing_period: meta.billing_period ?? attribution.billing_period ?? null,
  });
  trackEvent("checkout_started", {
    ...utmContext(),
    cta: attribution.cta,
    cta_section: attribution.cta_section,
    cta_page: attribution.cta_page,
    ...meta,
  });
}

export function trackSubscriptionCompleted(meta: Record<string, unknown> = {}) {
  const attribution = getFunnelAttribution();
  trackEvent("subscription_completed", {
    cta: attribution.cta,
    cta_section: attribution.cta_section,
    cta_page: attribution.cta_page,
    plan: attribution.plan ?? null,
    billing_period: attribution.billing_period ?? null,
    ...meta,
  });
  clearFunnelAttribution();
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!initialized || !TOKEN) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* noop */
  }
}
