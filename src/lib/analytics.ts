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
const META_PIXEL_ID = "1120398934987866";

let initialized = false;
let bootedSessionId: string | null = null;
let identifiedUserId: string | null = null;
let firstValueTrackingInstalled = false;

const LANDING_PATHS = new Set(["/", "/pricing"]);
const PUBLIC_ANALYTICS_PATHS = new Set([
  "/",
  "/pricing",
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

// O SDK pode adicionar contexto de navegação automaticamente. Em uma aplicação
// clínica, eventos de produto não devem carregar URL, pathname, título ou referrer.
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
const ATTRIBUTION_KEY = "ms_funnel_attribution";

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

  return (
    pathname
      .split("/")
      .map((segment) => {
        if (!segment) return segment;
        if (/^[0-9]+$/.test(segment)) return ":id";
        if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
        if (/^[A-Za-z0-9_-]{20,}$/.test(segment)) return ":id";
        return cleanString(segment, 48);
      })
      .join("/") || "/"
  );
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
 * Última barreira antes do envio pelo PostHog. Mantém localização somente no
 * pageview público que nós mesmos emitimos; eventos internos não carregam contexto
 * de rota, mesmo que o SDK tente acrescentá-lo automaticamente.
 */
function sanitizePostHogProperties(
  properties: Record<string, any>,
  eventName?: string,
): Record<string, any> {
  const clean: Record<string, any> = { ...properties };

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

  if (!TOKEN) return;

  try {
    posthog.init(TOKEN, {
      api_host: HOST,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      capture_exceptions: false,
      capture_performance: false,
      enable_recording_console_log: false,
      advanced_disable_flags: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      person_profiles: "identified_only",
      // Compatível com a versão do SDK instalada no projeto. Atua depois que
      // propriedades automáticas são adicionadas pelo PostHog.
      sanitize_properties: (properties, eventName) => sanitizePostHogProperties(properties, eventName),
    });
  } catch (e) {
    console.warn("[analytics] posthog init failed", e);
  }
}

export async function trackPageView(path: string, referrer?: string) {
  if (typeof window === "undefined") return;
  initAnalytics();

  const safePath = normalizePath(path);
  if (!PUBLIC_ANALYTICS_PATHS.has(safePath)) return;

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

  try {
    window.fbq?.("track", "PageView");
  } catch {
    /* noop */
  }

  if (!LANDING_PATHS.has(safePath)) return;

  try {
    const { error } = await supabase.from("page_views").insert({
      path: safePath,
      referrer: safeReferrerHost(referrer ?? document.referrer) ?? null,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 500),
      device: detectDevice(),
    });
    if (error) console.debug("[analytics] page_view insert failed", error.message);
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
  name:
    | "lead_created"
    | "signup_started"
    | "signup_completed"
    | "trial_started"
    | "first_login"
    | "trial_welcome_viewed"
    | "first_value_action"
    | "trial_expired"
    | "paywall_viewed",
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
  if (!userId) return;
  identifiedUserId = userId;
  initAnalytics();
  if (!TOKEN) return;

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
  identifiedUserId = null;
  if (!TOKEN || !initialized) return;
  try {
    posthog.reset();
  } catch {
    /* noop */
  }
}

async function currentUserId(): Promise<string | null> {
  if (identifiedUserId) return identifiedUserId;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const id = session?.user?.id ?? null;
    if (id) identifiedUserId = id;
    return id;
  } catch {
    return null;
  }
}

async function trackFirstValue(feature: string) {
  const userId = await currentUserId();
  if (!userId) return;
  trackLifecycleEvent("first_value_action", { feature }, `user:${userId}`);
}

function hasUsefulStructuredAnamnesis(data: any): boolean {
  const structure = data?.structure;
  if (!structure || typeof structure !== "object") return false;
  return Object.entries(structure).some(
    ([key, value]) => key !== "detectedSpecialty" && typeof value === "string" && value.trim().length > 0,
  );
}

function hasUsefulFunctionResult(functionName: string, data: any): boolean {
  if (functionName === "structure-anamnesis") return hasUsefulStructuredAnamnesis(data);
  if (functionName === "carpe-diem-round") {
    return typeof data?.content === "string" && data.content.trim().length > 0;
  }
  if (functionName === "generate-medical-document") {
    return typeof data?.content === "string" && data.content.trim().length > 0;
  }
  return false;
}

function featureForFunction(functionName: string): string | null {
  if (functionName === "structure-anamnesis") return "modo_escuta";
  if (functionName === "carpe-diem-round") return "modo_rotineiro";
  if (functionName === "generate-medical-document") return "medical_document";
  return null;
}

/**
 * Primeira entrega de valor da conta.
 *
 * - AgentChat usa fetch direto, então observamos apenas status/URL do endpoint.
 * - A versão de supabase-js usada pelo projeto expõe `functions` como getter que
 *   cria um FunctionsClient por acesso. Fixamos um cliente equivalente no próprio
 *   objeto Supabase e envolvemos apenas `invoke`, preservando o fetchWithAuth.
 * - Para Functions, o conteúdo é lido apenas localmente para responder um booleano
 *   (há saída útil?). Nenhum texto clínico é enviado ao analytics.
 */
export function installFirstValueResponseTracker(): () => void {
  if (typeof window === "undefined" || firstValueTrackingInstalled) return () => undefined;

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
      if (response.ok && pathname.endsWith("/functions/v1/agent-chat")) {
        void trackFirstValue("clinical_assistant");
      }
    } catch {
      /* tracking must never interfere with product traffic */
    }
    return response;
  };

  const originalFunctionsDescriptor = Object.getOwnPropertyDescriptor(supabase, "functions");
  const functionsClient = supabase.functions as any;
  const nativeInvoke = functionsClient.invoke.bind(functionsClient);
  functionsClient.invoke = async (functionName: string, options?: unknown) => {
    const result = await nativeInvoke(functionName, options);
    try {
      if (!result?.error && hasUsefulFunctionResult(functionName, result?.data)) {
        const feature = featureForFunction(functionName);
        if (feature) void trackFirstValue(feature);
      }
    } catch {
      /* tracking must never interfere with Edge Function calls */
    }
    return result;
  };

  window.fetch = wrappedFetch;
  Object.defineProperty(supabase, "functions", {
    configurable: true,
    enumerable: false,
    value: functionsClient,
  });
  firstValueTrackingInstalled = true;

  return () => {
    if (window.fetch === wrappedFetch) window.fetch = nativeFetch;
    if (originalFunctionsDescriptor) {
      Object.defineProperty(supabase, "functions", originalFunctionsDescriptor);
    } else {
      delete (supabase as any).functions;
    }
    firstValueTrackingInstalled = false;
  };
}

// Exportado apenas para manter uma única fonte do identificador do pixel no bundle
// e facilitar auditorias futuras sem espalhar o ID por novos arquivos.
export const META_PIXEL = META_PIXEL_ID;
