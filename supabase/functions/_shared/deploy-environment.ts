/**
 * Em qual ambiente esta Edge Function está rodando, e o que muda por ambiente.
 *
 * Regra única: "produção" é o projeto cujo SUPABASE_URL é exatamente o do ref
 * de produção. Em produção NADA muda: mesmos preços, mesmo cupom, mesmos
 * endereços de retorno, mesmo aviso ao Arsenal Med, sem depender de variável
 * nova. Em qualquer outro projeto (homologação, local, desconhecido) o padrão
 * é fechado: nada de ID do Stripe em modo real, nada de chave em modo real,
 * nenhum retorno para o site de produção e nenhuma chamada ao Arsenal Med.
 *
 * Módulo puro (sem Deno, sem rede): quem chama entrega o leitor de variáveis.
 */

export const PRODUCTION_PROJECT_REF = "rwiovxyftfbkvzbepfqi";
export const PRODUCTION_SITE_URL = "https://medstation-ai.com.br";
const PRODUCTION_SITE_HOSTS = ["medstation-ai.com.br", "www.medstation-ai.com.br"];

export type EnvGetter = (key: string) => string | null | undefined;

/** Leitor padrão no runtime das Edge Functions. Fora do Deno devolve undefined (padrão fechado). */
export const runtimeEnv: EnvGetter = (key) => {
  try {
    const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno;
    return deno?.env?.get?.(key);
  } catch {
    return undefined;
  }
};

export function projectRefFromSupabaseUrl(value: string | null | undefined): string | null {
  const match = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec((value ?? "").trim());
  return match ? match[1] : null;
}

export function isProductionDeployment(getEnv: EnvGetter = runtimeEnv): boolean {
  return projectRefFromSupabaseUrl(getEnv("SUPABASE_URL")) === PRODUCTION_PROJECT_REF;
}

// ---------------------------------------------------------------------------
// Endereços de retorno
// ---------------------------------------------------------------------------

/** Origem http(s) sem caminho, consulta ou credenciais; null se não for isso. */
export function cleanOrigin(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isProductionSiteOrigin(value: string | null | undefined): boolean {
  const origin = cleanOrigin(value);
  if (!origin) return false;
  return PRODUCTION_SITE_HOSTS.includes(new URL(origin).hostname.toLowerCase());
}

/** Fora de produção: endereço do app deste ambiente (APP_BASE_URL), nunca o site de produção. */
export function configuredAppBaseUrl(getEnv: EnvGetter = runtimeEnv): string | null {
  const origin = cleanOrigin(getEnv("APP_BASE_URL"));
  return origin && !isProductionSiteOrigin(origin) ? origin : null;
}

/** Endereço do site para links montados sem requisição do navegador (webhook, e-mails). */
export function siteUrl(getEnv: EnvGetter = runtimeEnv): string | null {
  return isProductionDeployment(getEnv) ? PRODUCTION_SITE_URL : configuredAppBaseUrl(getEnv);
}

/**
 * Origem usada nos retornos do checkout e do portal.
 * Produção: o cabeçalho Origin e, se `fallbackToSite`, o site de produção — igual ao que sempre foi.
 * Fora de produção: o cabeçalho Origin, desde que não seja o site de produção; senão APP_BASE_URL;
 * senão null (quem chama recusa a requisição).
 */
export function resolveReturnOrigin(
  requestOrigin: string | null | undefined,
  getEnv: EnvGetter = runtimeEnv,
  options: { fallbackToSite?: boolean } = {},
): string | null {
  const fallbackToSite = options.fallbackToSite !== false;
  if (isProductionDeployment(getEnv)) {
    return requestOrigin || (fallbackToSite ? PRODUCTION_SITE_URL : null);
  }
  const fromRequest = cleanOrigin(requestOrigin);
  if (fromRequest && !isProductionSiteOrigin(fromRequest)) return fromRequest;
  return fallbackToSite ? configuredAppBaseUrl(getEnv) : null;
}

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------

export type StripeCatalog = {
  /** Price da assinatura mensal no preço de lançamento. */
  monthlyPriceId: string;
  /** Marca o plano anual como vendável; o anual é cobrado à vista por price_data. */
  yearlyPriceId: string;
  /** Cupom padrão do programa de indicação; undefined = sem cupom padrão. */
  referralCoupon: string | undefined;
};

/** Catálogo do Stripe em modo real. Só vale no projeto de produção. */
export const LIVE_STRIPE_CATALOG: Readonly<StripeCatalog> = Object.freeze({
  monthlyPriceId: "price_1U4Zo7ACiwQRloW4cJIn0jYn",
  yearlyPriceId: "price_1U4ZoTACiwQRloW4f30FmEPb",
  referralCoupon: "XzP9db0s",
});

const PRICE_ID_RE = /^price_[A-Za-z0-9]{8,}$/;
const LIVE_PRICE_IDS = [LIVE_STRIPE_CATALOG.monthlyPriceId, LIVE_STRIPE_CATALOG.yearlyPriceId];

export type StripeCatalogResult =
  | { ok: true; catalog: StripeCatalog }
  | { ok: false; reason: "catalog_not_configured"; missing: string[] };

/**
 * Produção: o catálogo fixo de sempre (variáveis são ignoradas).
 * Fora de produção: STRIPE_PRICE_MONTHLY é obrigatório e não pode ser um ID do modo real;
 * STRIPE_PRICE_YEARLY e STRIPE_REFERRAL_COUPON são opcionais. Sem isso, não há checkout.
 */
export function resolveStripeCatalog(getEnv: EnvGetter = runtimeEnv): StripeCatalogResult {
  if (isProductionDeployment(getEnv)) return { ok: true, catalog: { ...LIVE_STRIPE_CATALOG } };

  const read = (key: string) => (getEnv(key) ?? "").trim();
  const usable = (id: string) => PRICE_ID_RE.test(id) && !LIVE_PRICE_IDS.includes(id);
  const monthly = read("STRIPE_PRICE_MONTHLY");
  const yearly = read("STRIPE_PRICE_YEARLY");
  const missing: string[] = [];
  if (!usable(monthly)) missing.push("STRIPE_PRICE_MONTHLY");
  if (yearly && !usable(yearly)) missing.push("STRIPE_PRICE_YEARLY");
  if (missing.length) return { ok: false, reason: "catalog_not_configured", missing };

  return {
    ok: true,
    catalog: {
      monthlyPriceId: monthly,
      yearlyPriceId: yearly || "one_time",
      referralCoupon: read("STRIPE_REFERRAL_COUPON") || undefined,
    },
  };
}

/** Produção: qualquer chave, como sempre. Fora de produção: só chave de teste. */
export function stripeKeyAllowed(key: string | null | undefined, getEnv: EnvGetter = runtimeEnv): boolean {
  if (isProductionDeployment(getEnv)) return true;
  return /^(sk|rk)_test_[A-Za-z0-9]+$/.test((key ?? "").trim());
}

export type StripeEnvironmentResult =
  | { ok: true; catalog: StripeCatalog }
  | { ok: false; reason: "live_key_outside_production" | "catalog_not_configured"; missing: string[] };

/** Tudo o que o checkout precisa conferir antes da primeira chamada ao Stripe. */
export function resolveStripeEnvironment(getEnv: EnvGetter = runtimeEnv): StripeEnvironmentResult {
  if (!stripeKeyAllowed(getEnv("STRIPE_SECRET_KEY"), getEnv)) {
    return { ok: false, reason: "live_key_outside_production", missing: ["STRIPE_SECRET_KEY (de teste)"] };
  }
  return resolveStripeCatalog(getEnv);
}

// ---------------------------------------------------------------------------
// Bônus Arsenal Med
// ---------------------------------------------------------------------------

export const ARSENAL_BONUS_LIVE_ENDPOINT = "https://arsenalmed.com.br/api/public/medstation-bonus";
const ARSENAL_LIVE_HOSTS = ["arsenalmed.com.br", "www.arsenalmed.com.br"];

export type ArsenalBonusTarget =
  | { enabled: true; endpoint: string }
  | { enabled: false; reason: "outside_production" };

/**
 * Produção: avisa o Arsenal Med no endereço real, como sempre.
 * Fora de produção: desligado. Só liga se ARSENAL_BONUS_ENABLED=true E houver um
 * ARSENAL_BONUS_ENDPOINT https que NÃO seja o site real (um simulador de teste).
 */
export function resolveArsenalBonusTarget(getEnv: EnvGetter = runtimeEnv): ArsenalBonusTarget {
  if (isProductionDeployment(getEnv)) return { enabled: true, endpoint: ARSENAL_BONUS_LIVE_ENDPOINT };
  if ((getEnv("ARSENAL_BONUS_ENABLED") ?? "").trim() !== "true") return { enabled: false, reason: "outside_production" };
  try {
    const url = new URL((getEnv("ARSENAL_BONUS_ENDPOINT") ?? "").trim());
    if (url.protocol === "https:" && !ARSENAL_LIVE_HOSTS.includes(url.hostname.toLowerCase())) {
      return { enabled: true, endpoint: url.href };
    }
  } catch {
    /* endereço ausente ou inválido: continua desligado */
  }
  return { enabled: false, reason: "outside_production" };
}
