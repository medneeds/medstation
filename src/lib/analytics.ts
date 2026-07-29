// Analytics: PostHog + tabela local `page_views`.
// PostHog fornece painéis ricos em posthog.com; a tabela local alimenta
// gráficos nativos do painel admin.
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
  // PostHog já captura automaticamente; forçamos apenas em SPAs no route change
  if (initialized && TOKEN) {
    try {
      posthog.capture("$pageview", { $current_url: window.location.href });
    } catch {
      /* noop */
    }
  }

  // Registro local só para páginas relevantes ao funil de venda (evita ruído)
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
    // silencioso: analytics não deve quebrar UX
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

/* -------------------------------------------------------------------------
 * Funil de conversão: cta_click → checkout_started → subscription_completed
 * Cada etapa carrega o plano e a origem do CTA. A atribuição do último CTA
 * clicado é persistida na sessão para que as etapas seguintes (que acontecem
 * em outra página, ou após o redirect do provedor de pagamento) mantenham
 * o contexto de onde a intenção nasceu.
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
    // O checkout redireciona para fora do domínio; localStorage garante que a
    // atribuição sobreviva até o retorno em /welcome.
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
  /** Identificador único do botão, ex.: "hero_ver_planos" */
  cta: string;
  /** Bloco da página onde o CTA vive, ex.: "hero", "pricing", "footer" */
  section?: string;
  /** Plano associado ao CTA, quando houver */
  plan?: string | null;
  billing_period?: "monthly" | "yearly" | null;
  /** Destino do clique, ex.: "/pricing" ou "#planos" */
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
  /** Slug do plano no Stripe, ex.: "pro2_bundle_yearly" */
  plan?: string | null;
  product?: string | null;
  billing_period?: "monthly" | "yearly" | null;
  price_brl?: number | null;
  /** Onde o checkout foi iniciado, ex.: "pricing_page", "landing_inline", "agent_guard" */
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
