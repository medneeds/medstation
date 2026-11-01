// Consentimento de cookies e tecnologias de rastreamento (LGPD, art. 7º, I e
// Guia Orientativo de Cookies da ANPD).
//
// Categorias:
// - necessários: login, segurança do aparelho, tema, preferências. Sempre ativos
//   (execução do contrato / legítimo interesse) e não passam por aqui.
// - analytics: PostHog (terceiro; região definida em VITE_LOVABLE_CONNECTOR_POSTHOG_REGION,
//   hoje "us"). Só carrega com consentimento.
// - marketing: Meta Pixel. Só carrega com consentimento.
//
// O index.html lê a mesma chave para decidir se carrega o Pixel no primeiro
// paint — se mudar a chave ou o formato, atualize o script de lá.

export const CONSENT_STORAGE_KEY = "ms_cookie_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_CHANGED_EVENT = "ms:consent-changed";
export const OPEN_COOKIE_PREFERENCES_EVENT = "ms:open-cookie-preferences";

export interface CookieConsent {
  v: typeof CONSENT_VERSION;
  analytics: boolean;
  marketing: boolean;
  /** ISO 8601 — prova de quando o titular decidiu. */
  decidedAt: string;
}

declare global {
  interface Window {
    /** Definido no index.html: injeta e inicializa o Meta Pixel. */
    __msLoadPixel?: (fromApp?: boolean) => void;
  }
}

/** Valida o formato salvo; qualquer coisa diferente conta como "não decidiu". */
export function parseConsent(raw: string | null | undefined): CookieConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CookieConsent> | null;
    if (
      !value ||
      value.v !== CONSENT_VERSION ||
      typeof value.analytics !== "boolean" ||
      typeof value.marketing !== "boolean" ||
      typeof value.decidedAt !== "string"
    ) {
      return null;
    }
    return {
      v: CONSENT_VERSION,
      analytics: value.analytics,
      marketing: value.marketing,
      decidedAt: value.decidedAt,
    };
  } catch {
    return null;
  }
}

export function getConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return getConsent()?.marketing === true;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const consent: CookieConsent = {
    v: CONSENT_VERSION,
    analytics: choice.analytics === true,
    marketing: choice.marketing === true,
    decidedAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") return consent;

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* sem storage: vale só para esta visita */
  }

  applyMarketingConsent(consent.marketing);

  try {
    window.dispatchEvent(new CustomEvent<CookieConsent>(CONSENT_CHANGED_EVENT, { detail: consent }));
  } catch {
    /* noop */
  }

  return consent;
}

function applyMarketingConsent(granted: boolean) {
  try {
    if (granted) {
      // Carrega agora, sem esperar a próxima visita.
      window.__msLoadPixel?.(true);
      window.fbq?.("consent", "grant");
    } else {
      // Se o Pixel já tinha sido carregado nesta aba, para de enviar e apaga seus cookies.
      window.fbq?.("consent", "revoke");
      clearMetaCookies();
    }
  } catch {
    /* noop */
  }
}

/** Apaga os cookies do Meta (_fbp/_fbc) no domínio atual e no domínio-pai. */
function clearMetaCookies() {
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = ["", host, parts.length > 2 ? `.${parts.slice(-3).join(".")}` : `.${host}`, `.${parts.slice(-2).join(".")}`];
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

export function onConsentChange(listener: (consent: CookieConsent) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CookieConsent>).detail;
    if (detail) listener(detail);
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT));
}
