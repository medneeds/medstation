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

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!initialized || !TOKEN) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* noop */
  }
}
