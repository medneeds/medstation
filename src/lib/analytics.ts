// Analytics de aquisição e produto com privacidade por padrão.
// Regras centrais:
// - nenhum autocapture/session replay;
// - pageviews somente em rotas públicas explicitamente permitidas;
// - propriedades enviadas passam por allowlist e normalização;
// - nenhuma informação clínica, nome, e-mail, telefone, CRM ou conteúdo livre é enviado.
import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

const TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
const REGION = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string | undefined) ?? "eu";
const HOST = REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";

let initialized = false;
let bootedSessionId: string | null = null;
let firstValueFetchInstalled = false;

const LANDING_PATHS = new Set(["/", "/precos", "/pricing", "/planos"]);
const PUBLIC_ANALYTICS_PATHS = new Set([
  "/",
  "/pricing",
  "/precos",
  "/planos",
  "/auth",
  "/confirmar-email",
  "/obrigado",
  "/welcome",
]);

const SAFE_ANALYTICS_KEYS = new Set([
  "source",
  "auth_method",
  "destination",
  "trial_source",
  "trial_started_at",
  "trial_ends_at",
  "access_status",
  "blocked_path",
  "feature",
  "agent_type",
  "plan",
  "billing_period",
  "clicked_at",
  "cta",
  "cta_section",
  "cta_page",
  "origin",
  "auth_state",
  "has_coupon",
  "price_brl",
  "product",
  "transaction_id",
  "amount_brl",
  "currency",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "account_state",
  "status",
]);

// Propriedades que o SDK pode adicionar automaticamente e que não queremos
// carregar em eventos de produto/marketing dentro de uma aplicação clínica.
const POSTHOG_LOCATION_KEYS = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$referring_domain",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$initial_referring_domain",
  "$host",
  "$title",
  "$search_engine",
  "$search_engine_query",
] as const;

const CAMPAIGN_KEY = "ms_campaign_attribution";
const CAMPAIGN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredCampaign {
  captured_at: number;
  values: Record<string, string>;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

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

function cleanString(value: string, max = 160): string {
  return value.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function normalizePath(input: string): string {
  let pathname = input || "/";
  try {
    pathname = new URL(input, window.location.origin).pathname;
  } catch {
    pathname = input.split(/[?#]/)[0] || "/";
  }

  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (/^[0-9]+$/.test(segment)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      if (/^[A-Za-z0-9_-]{20,}$/.test(segment)) return ":id";
      return cleanString(segment, 48);
    })
    .join("/") || "/";
}

function safeReferrerHost(referrer?: string | null): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname.slice(0, 120);
  } catch {
    return undefined;
  }
}

function sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!props) return out;

  for (const [key, value] of Object.entries(props)) {
    if (!SAFE_ANALYTICS_KEYS.has(key) || value === undefined) continue;

    if (key === "blocked_path" || key === "destination" || key === "cta_page") {
      if (typeof value === "string") out[key] = normalizePath(value);
      continue;
    }

    if (key === "referrer") {
      if (typeof value === "string") {
        const host = safeReferrerHost(value) ?? cleanString(value, 120);
        if (host) out[key] = host;
      }
      continue;
    }

    if (typeof value === "string") out[key] = cleanString(value);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) out[key] = value;
  }

  return out;
}

/**
 * Última barreira de privacidade antes do envio pelo SDK.
 * O PostHog acrescenta propriedades automáticas a eventos customizados; removemos
 * qualquer contexto de URL/título em eventos de produto e preservamos URL apenas
 * para pageviews públicos que nós mesmos emitimos.
 */
function sanitizePostHogProperties(
  properties: Record<string, unknown>,
  eventName?: string,
): Record<string, unknown> {
  const clean = { ...properties };

  for (const key of POSTHOG_LOCATION_KEYS) delete clean[key];

  if (eventName === "$pageview" && typeof window !== "undefined") {
    const safePath = normalizePath(window.location.pathname);
    if (PUBLIC_ANALYTICS_PATHS.has(safePath)) {
      clean.$pathname = safePath;
      clean.$current_url = `${window.location.origin}${safePath}`;
    }
  }

  return clean;
}

function readStoredCampaign(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(CAMPAIGN_KEY) ?? localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredCampaign;
    if (!parsed?.captured_at || Date.now() - parsed.captured_at > CAMPAIGN_TTL_MS) {
      sessionStorage.removeItem(CAMPAIGN_KEY);
      localStorage.removeItem(CAMPAIGN_KEY);
      return {};
    }
    return parsed.values ?? {};
  } catch {
    return {};
  }
}

function captureCampaignContext(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    const current: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const value = p.get(key);
      if (value) current[key] = cleanString(value, 120);
    }
    const referrer = safeReferrerHost(document.referrer);
    if (referrer) current.referrer = referrer;

    const hasCampaign = Object.keys(current).some((key) => key.startsWith("utm_"));
    if (hasCampaign) {
      const stored: StoredCampaign = { captured_at: Date.now(), values: current };
      const serialized = JSON.stringify(stored);
      sessionStorage.setItem(CAMPAIGN_KEY, serialized);
      localStorage.setItem(CAMPAIGN_KEY, serialized);
      return current;
    }

    return readStoredCampaign();
  } catch {
    return readStoredCampaign();
  }
}

function utmContext(): Record<string, unknown> {
  return sanitizeProperties(captureCampaignContext());
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  captureCampaignContext();

  if (TOKEN) {
    try {
      posthog.init(TOKEN, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        person_profiles: "identified_only",
        // Mantido por compatibilidade com a versão instalada. A função atua
        // depois que o SDK adiciona propriedades automáticas ao evento.
        sanitize_properties: (properties, eventName) =>
          sanitizePostHogProperties(properties as Record<string, unknown>, eventName),
      });
    } catch (e) {
      console.warn("[analytics] posthog init failed", e);
    }
  }
}

export async function trackPageView(path: string, referrer?: string) {
  if (typeof window === "undefined") return;
  initAnalytics();

  const safePath = normalizePath(path);
  if (!PUBLIC_ANALYTICS_PATHS.has(safePath)) return;

  // PostHog recebe apenas URLs públicas sem query/hash.
  if (TOKEN) {
    try {
      posthog.capture("$pageview", {
        $current_url: `${window.location.origin}${safePath}`,
        $pathname: safePath,
      });
    } catch {
      /* noop */
    }
  }

  // Meta também recebe PageView somente em superfícies públicas.
  try {
    window.fbq?.("track", "PageView");
  } catch {
    /* noop */
  }

  // Registro local apenas para páginas relevantes ao funil de venda.
  if (!LANDING_PATHS.has(safePath)) return;
  try {
    await supabase.from("page_views").insert({
      path: safePath,
      referrer: safeReferrerHost(referrer ?? document.referrer) ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
      device: detectDevice(),
    });
  } catch (e) {
    console.debug("[analytics] page_view insert failed", e);
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  initAnalytics();
  if (!TOKEN) return;
  try {
    posthog.capture(name, sanitizeProperties(props));
  } catch {
    /* noop */
  }
}

function trackMetaLifecycle(name: string) {
  const metaEvent =
    name === "lead_created"
      ? "Lead"
      : name === "signup_completed"
        ? "CompleteRegistration"
        : name === "trial_started"
          ? "StartTrial"
          : null;
  if (!metaEvent) return;
  try {
    window.fbq?.("track", metaEvent, { content_name: "MedStation" });
  } catch {
    /* noop */
  }
}

/**
 * Marcos entre aquisição e checkout. `onceKey` evita duplicidade local.
 * Somente metadados comerciais da allowlist acima podem sair do navegador.
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
  trackMetaLifecycle(name);
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
    cta_page: typeof window !== "undefined" ? normalizePath(window.location.pathname) : undefined,
    plan: meta.plan ?? null,
    billing_period: meta.billing_period ?? null,
    clicked_at: new Date().toISOString(),
  };
  saveAttribution(attribution);
  trackEvent("cta_click", {
    ...utmContext(),
    ...attribution,
    destination: meta.destination,
  });
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
    plan: meta.plan,
    product: meta.product,
    billing_period: meta.billing_period,
    price_brl: meta.price_brl,
    origin: meta.origin,
    auth_state: meta.auth_state,
    has_coupon: Boolean(meta.coupon),
  });

  try {
    const params: Record<string, unknown> = {
      content_name: "MedStation",
      content_category: meta.plan ?? undefined,
    };
    if (typeof meta.price_brl === "number") {
      params.currency = "BRL";
      params.value = meta.price_brl;
    }
    window.fbq?.("track", "InitiateCheckout", params);
  } catch {
    /* noop */
  }
}

export function trackSubscriptionCompleted(meta: Record<string, unknown> = {}) {
  const attribution = getFunnelAttribution();
  trackEvent("subscription_completed", {
    ...utmContext(),
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
  initAnalytics();
  if (!TOKEN || !userId) return;
  try {
    posthog.identify(userId, {
      account_state: "authenticated",
      ...sanitizeProperties(traits),
    });
  } catch {
    /* noop */
  }
}

export function resetAnalyticsIdentity() {
  if (!TOKEN || !initialized) return;
  try {
    posthog.reset();
  } catch {
    /* noop */
  }
}

const FIRST_VALUE_ENDPOINTS: Record<string, string> = {
  "/functions/v1/agent-chat": "clinical_assistant",
  "/functions/v1/structure-anamnesis": "modo_escuta",
  "/functions/v1/carpe-diem-round": "modo_rotineiro",
  "/functions/v1/generate-medical-document": "medical_document",
};

/**
 * Observa apenas o status HTTP de endpoints que geram uma saída útil.
 * Não lê, clona ou envia request/response bodies.
 */
export function installFirstValueResponseTracker(): () => void {
  if (typeof window === "undefined" || firstValueFetchInstalled) return () => undefined;

  const nativeFetch = window.fetch.bind(window);
  const wrappedFetch: typeof window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    try {
      const input = args[0];
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const pathname = new URL(rawUrl, window.location.origin).pathname;
      const feature = Object.entries(FIRST_VALUE_ENDPOINTS).find(([endpoint]) => pathname.endsWith(endpoint))?.[1];
      if (response.ok && feature) {
        trackLifecycleEvent("first_value_action", { feature }, "global");
      }
    } catch {
      /* tracking must never interfere with product traffic */
    }
    return response;
  };

  window.fetch = wrappedFetch;
  firstValueFetchInstalled = true;

  return () => {
    if (window.fetch === wrappedFetch) window.fetch = nativeFetch;
    firstValueFetchInstalled = false;
  };
}
