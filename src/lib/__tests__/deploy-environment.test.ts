import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ARSENAL_BONUS_LIVE_ENDPOINT,
  configuredAppBaseUrl,
  isProductionDeployment,
  projectRefFromSupabaseUrl,
  resolveArsenalBonusTarget,
  resolveReturnOrigin,
  resolveStripeCatalog,
  resolveStripeEnvironment,
  siteUrl,
  stripeKeyAllowed,
  type EnvGetter,
} from "../../../supabase/functions/_shared/deploy-environment";
import { notifyArsenalBonus, notifyArsenalBonusOutcome } from "../../../supabase/functions/_shared/arsenal-bonus";

const env = (values: Record<string, string>): EnvGetter => (key) => values[key];

// Valores de hoje em produção, escritos aqui de propósito (não importados):
// se alguém mudar o comportamento de produção, estes testes quebram.
const PRODUCTION_URL = "https://rwiovxyftfbkvzbepfqi.supabase.co";
const STAGING_URL = "https://qcvvwbbeuvawgccstyro.supabase.co";
const PRODUCTION_SITE = "https://medstation-ai.com.br";
const REAL_ARSENAL = "https://arsenalmed.com.br/api/public/medstation-bonus";
const LIVE_MONTHLY = "price_1U4Zo7ACiwQRloW4cJIn0jYn";
const LIVE_YEARLY = "price_1U4ZoTACiwQRloW4f30FmEPb";
const LIVE_COUPON = "XzP9db0s";
// Textos fictícios com o formato das chaves; não são credenciais.
const FAKE_LIVE_KEY = "sk_live_" + "x".repeat(24);
const FAKE_TEST_KEY = "sk_test_" + "x".repeat(24);
const PAID_REFERENCE = "cs_test_a1MmqcIy2HhgHCxq2NI70PNq";

const production = (extra: Record<string, string> = {}) =>
  env({ SUPABASE_URL: PRODUCTION_URL, STRIPE_SECRET_KEY: FAKE_LIVE_KEY, ...extra });
const staging = (extra: Record<string, string> = {}) =>
  env({ SUPABASE_URL: STAGING_URL, STRIPE_SECRET_KEY: FAKE_TEST_KEY, ...extra });

describe("identificação do ambiente", () => {
  it("só o endereço exato do projeto de produção conta como produção", () => {
    expect(isProductionDeployment(production())).toBe(true);
    expect(isProductionDeployment(env({ SUPABASE_URL: PRODUCTION_URL + "/" }))).toBe(true);
    expect(isProductionDeployment(staging())).toBe(false);
    expect(isProductionDeployment(env({}))).toBe(false);
    for (const lookalike of [
      "http://rwiovxyftfbkvzbepfqi.supabase.co",
      "https://rwiovxyftfbkvzbepfqi.supabase.co.exemplo.com",
      "https://rwiovxyftfbkvzbepfqi.supabase.co/functions/v1",
      "https://exemplo.com/?x=rwiovxyftfbkvzbepfqi.supabase.co",
    ]) {
      expect(isProductionDeployment(env({ SUPABASE_URL: lookalike }))).toBe(false);
    }
    expect(projectRefFromSupabaseUrl(STAGING_URL)).toBe("qcvvwbbeuvawgccstyro");
  });
});

describe("produção continua igual", () => {
  it("usa os preços e o cupom de sempre, ignorando variáveis de teste", () => {
    const result = resolveStripeEnvironment(production({ STRIPE_PRICE_MONTHLY: "price_teste0000000000" }));
    expect(result).toEqual({
      ok: true,
      catalog: { monthlyPriceId: LIVE_MONTHLY, yearlyPriceId: LIVE_YEARLY, referralCoupon: LIVE_COUPON },
    });
  });

  it("aceita a chave que estiver configurada, sem checagem nova", () => {
    expect(stripeKeyAllowed(FAKE_LIVE_KEY, production())).toBe(true);
    expect(stripeKeyAllowed("", production())).toBe(true);
  });

  it("retorno: o cabeçalho Origin ou, na falta dele, o site", () => {
    expect(resolveReturnOrigin("https://medstation-ai.com.br", production())).toBe(PRODUCTION_SITE);
    expect(resolveReturnOrigin("https://qualquer.exemplo", production())).toBe("https://qualquer.exemplo");
    expect(resolveReturnOrigin(null, production())).toBe(PRODUCTION_SITE);
    // create-checkout sempre exigiu o cabeçalho.
    expect(resolveReturnOrigin(null, production(), { fallbackToSite: false })).toBeNull();
    expect(siteUrl(production())).toBe(PRODUCTION_SITE);
  });

  it("avisa o Arsenal Med no endereço real", async () => {
    expect(ARSENAL_BONUS_LIVE_ENDPOINT).toBe(REAL_ARSENAL);
    expect(resolveArsenalBonusTarget(production())).toEqual({ enabled: true, endpoint: REAL_ARSENAL });
    const ok = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await notifyArsenalBonusOutcome(PAID_REFERENCE, ok, production())).toBe("registered");
    expect(ok).toHaveBeenCalledTimes(1);
    expect(ok.mock.calls[0][0]).toBe(REAL_ARSENAL);
    expect(JSON.parse(ok.mock.calls[0][1].body)).toEqual({ reference: PAID_REFERENCE });
  });
});

describe("fora de produção: Stripe", () => {
  it("sem catálogo de teste configurado não há checkout", () => {
    expect(resolveStripeEnvironment(staging())).toEqual({
      ok: false, reason: "catalog_not_configured", missing: ["STRIPE_PRICE_MONTHLY"],
    });
  });

  it("recusa os IDs de preço do modo real, mesmo vindos por variável", () => {
    expect(resolveStripeCatalog(staging({ STRIPE_PRICE_MONTHLY: LIVE_MONTHLY })).ok).toBe(false);
    const result = resolveStripeCatalog(staging({ STRIPE_PRICE_MONTHLY: "price_teste0000000000", STRIPE_PRICE_YEARLY: LIVE_YEARLY }));
    expect(result).toEqual({ ok: false, reason: "catalog_not_configured", missing: ["STRIPE_PRICE_YEARLY"] });
  });

  it("com preço de teste funciona; o cupom de produção não é herdado", () => {
    const result = resolveStripeEnvironment(staging({ STRIPE_PRICE_MONTHLY: "price_teste0000000000" }));
    expect(result).toEqual({
      ok: true,
      catalog: { monthlyPriceId: "price_teste0000000000", yearlyPriceId: "one_time", referralCoupon: undefined },
    });
    const withCoupon = resolveStripeCatalog(staging({ STRIPE_PRICE_MONTHLY: "price_teste0000000000", STRIPE_REFERRAL_COUPON: "CUPOM_TESTE" }));
    expect(withCoupon.ok && withCoupon.catalog.referralCoupon).toBe("CUPOM_TESTE");
  });

  it("recusa chave em modo real", () => {
    expect(stripeKeyAllowed(FAKE_LIVE_KEY, staging())).toBe(false);
    expect(stripeKeyAllowed("", staging())).toBe(false);
    expect(stripeKeyAllowed(FAKE_TEST_KEY, staging())).toBe(true);
    expect(resolveStripeEnvironment(env({
      SUPABASE_URL: STAGING_URL, STRIPE_SECRET_KEY: FAKE_LIVE_KEY, STRIPE_PRICE_MONTHLY: "price_teste0000000000",
    }))).toMatchObject({ ok: false, reason: "live_key_outside_production" });
  });

  it("ambiente desconhecido (sem SUPABASE_URL) é tratado como fora de produção", () => {
    expect(resolveStripeEnvironment(env({ STRIPE_SECRET_KEY: FAKE_LIVE_KEY })).ok).toBe(false);
    expect(resolveArsenalBonusTarget(env({})).enabled).toBe(false);
    expect(siteUrl(env({}))).toBeNull();
  });
});

describe("fora de produção: retornos nunca apontam para o site de produção", () => {
  it("usa a origem da requisição quando ela não é o site de produção", () => {
    expect(resolveReturnOrigin("http://127.0.0.1:4173", staging())).toBe("http://127.0.0.1:4173");
    expect(resolveReturnOrigin("https://preview.exemplo.dev", staging())).toBe("https://preview.exemplo.dev");
  });

  it("origem de produção, ausente ou inválida cai em APP_BASE_URL ou é recusada", () => {
    const withBase = staging({ APP_BASE_URL: "https://preview.exemplo.dev" });
    for (const origin of [PRODUCTION_SITE, "https://www.medstation-ai.com.br", null, "", "javascript:alert(1)", "https://a.b/caminho"]) {
      expect(resolveReturnOrigin(origin, withBase)).toBe("https://preview.exemplo.dev");
      expect(resolveReturnOrigin(origin, staging())).toBeNull();
      expect(resolveReturnOrigin(origin, withBase, { fallbackToSite: false })).toBeNull();
    }
  });

  it("APP_BASE_URL apontando para produção não vale", () => {
    expect(configuredAppBaseUrl(staging({ APP_BASE_URL: PRODUCTION_SITE }))).toBeNull();
    expect(siteUrl(staging({ APP_BASE_URL: PRODUCTION_SITE }))).toBeNull();
    expect(siteUrl(staging({ APP_BASE_URL: "https://preview.exemplo.dev" }))).toBe("https://preview.exemplo.dev");
  });
});

describe("fora de produção: bônus Arsenal Med não chama o destino real", () => {
  it("por padrão não faz requisição nenhuma", async () => {
    const injected = vi.fn();
    const globalFetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rede proibida no teste"));
    try {
      expect(resolveArsenalBonusTarget(staging())).toEqual({ enabled: false, reason: "outside_production" });
      expect(await notifyArsenalBonusOutcome(PAID_REFERENCE, injected, staging())).toBe("blocked_outside_production");
      expect(await notifyArsenalBonus(PAID_REFERENCE, injected, staging())).toBe(false);
      // Sem leitor de variáveis (como o webhook chama) e sem Deno: também fechado.
      expect(await notifyArsenalBonusOutcome(PAID_REFERENCE)).toBe("blocked_outside_production");
      expect(injected).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    } finally {
      globalFetch.mockRestore();
    }
  });

  it("ligar por variável não basta: o endereço real é recusado", async () => {
    const injected = vi.fn();
    for (const extra of [
      { ARSENAL_BONUS_ENABLED: "true" },
      { ARSENAL_BONUS_ENABLED: "true", ARSENAL_BONUS_ENDPOINT: REAL_ARSENAL },
      { ARSENAL_BONUS_ENABLED: "true", ARSENAL_BONUS_ENDPOINT: "https://www.arsenalmed.com.br/api/x" },
      { ARSENAL_BONUS_ENABLED: "true", ARSENAL_BONUS_ENDPOINT: "http://simulador.exemplo.dev/bonus" },
      { ARSENAL_BONUS_ENDPOINT: "https://simulador.exemplo.dev/bonus" },
    ]) {
      expect(await notifyArsenalBonusOutcome(PAID_REFERENCE, injected, staging(extra))).toBe("blocked_outside_production");
    }
    expect(injected).not.toHaveBeenCalled();
  });

  it("com um simulador explícito, chama só o simulador", async () => {
    const simulator = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const target = staging({ ARSENAL_BONUS_ENABLED: "true", ARSENAL_BONUS_ENDPOINT: "https://simulador.exemplo.dev/bonus" });
    expect(await notifyArsenalBonusOutcome(PAID_REFERENCE, simulator, target)).toBe("registered");
    expect(simulator).toHaveBeenCalledTimes(1);
    expect(simulator.mock.calls[0][0]).toBe("https://simulador.exemplo.dev/bonus");
  });
});

describe("as funções usam o resolvedor de ambiente (leitura do código-fonte)", () => {
  const source = (path: string) => readFileSync(join(process.cwd(), "supabase/functions", path), "utf8");
  const CHECKOUT_PATH = ["create-checkout", "guest-checkout", "complete-checkout", "customer-portal", "stripe-webhook"];

  it("nenhuma função do caminho de pagamento traz o site de produção, preço ou cupom fixos", () => {
    for (const fn of CHECKOUT_PATH) {
      const code = source(`${fn}/index.ts`);
      expect(code, fn).not.toContain(PRODUCTION_SITE);
      expect(code, fn).not.toContain(LIVE_MONTHLY);
      expect(code, fn).not.toContain(LIVE_YEARLY);
      expect(code, fn).not.toContain(LIVE_COUPON);
      expect(code, fn).toContain("../_shared/deploy-environment.ts");
    }
  });

  it("checkout confere o ambiente antes de criar o cliente do Stripe", () => {
    for (const fn of ["create-checkout", "guest-checkout"]) {
      const code = source(`${fn}/index.ts`);
      const guard = code.indexOf("resolveStripeEnvironment(");
      expect(guard, fn).toBeGreaterThan(-1);
      expect(guard, fn).toBeLessThan(code.indexOf("new Stripe("));
    }
    for (const fn of ["complete-checkout", "customer-portal", "stripe-webhook"]) {
      const code = source(`${fn}/index.ts`);
      const guard = code.indexOf("stripeKeyAllowed(");
      expect(guard, fn).toBeGreaterThan(-1);
      expect(guard, fn).toBeLessThan(code.indexOf("new Stripe("));
    }
  });

  it("o webhook sai do bônus antes de alerta e e-mail quando o ambiente bloqueia", () => {
    const code = source("stripe-webhook/index.ts");
    expect(code).not.toMatch(/notifyArsenalBonus\(/);
    const body = code.slice(code.indexOf("async function deliverAnnualBonus("));
    const blocked = body.indexOf('outcome === "blocked_outside_production"');
    expect(blocked).toBeGreaterThan(-1);
    expect(body.slice(blocked, blocked + 400)).toMatch(/return;/);
    expect(blocked).toBeLessThan(body.indexOf("create_admin_notification"));
    expect(blocked).toBeLessThan(body.indexOf("sendTemplateEmailWithLog("));
  });

  it("o endereço real do Arsenal Med só existe no módulo de ambiente", () => {
    expect(source("_shared/deploy-environment.ts")).toContain(REAL_ARSENAL);
    for (const path of ["_shared/arsenal-bonus.ts", "stripe-webhook/index.ts", "admin-resend-arsenal-bonus/index.ts"]) {
      expect(source(path), path).not.toContain(REAL_ARSENAL);
    }
    expect(source("admin-resend-arsenal-bonus/index.ts")).toContain("resolveArsenalBonusTarget(");
  });
});
