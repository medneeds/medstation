import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const oneTime = read("supabase/functions/_shared/one-time-purchase.ts");
const createCheckout = read("supabase/functions/create-checkout/index.ts");
const guestCheckout = read("supabase/functions/guest-checkout/index.ts");
const webhook = read("supabase/functions/stripe-webhook/index.ts");
const attempts = read("supabase/functions/_shared/purchase-attempts.ts");
const recovery = read("supabase/functions/admin-purchase-recovery/index.ts");
const pricing = read("src/pages/Pricing.tsx");
const adminList = read("supabase/functions/admin-list-subscribers/index.ts");

// --- catálogo -------------------------------------------------------------

describe("catálogo de compras avulsas", () => {
  it("mensal cartão NÃO é compra avulsa: continua subscription", () => {
    expect(oneTime).not.toContain('"pro_completo":');
    expect(createCheckout).toContain('mode: "subscription"');
    expect(createCheckout).toContain("pro_completo: \"price_1U4Zo7ACiwQRloW4cJIn0jYn\"");
  });

  it("Pix mensal é one-time de 5990 BRL, 30 dias, categorizado", () => {
    expect(oneTime).toContain('MONTHLY_PIX_PLAN_SLUG = "pix_monthly_30d"');
    expect(oneTime).toContain("amountCents: 5990");
    expect(oneTime).not.toContain("amountCents: 4990");
    expect(oneTime).toContain('category: "pix_monthly_one_time"');
    expect(oneTime).toContain('accessPeriod: "monthly_30d"');
    expect(oneTime).toContain("accessDays: 30");
  });

  it("Pix mensal nunca usa Price dedicado por env (evita divergência de valor)", () => {
    expect(oneTime).not.toContain('priceEnvVar: "STRIPE_MONTHLY_PIX_PRICE_ID"');
  });

  it("anual continua 49990 e mensal cartão continua assinatura recorrente", () => {
    expect(oneTime).toContain("amountCents: 49990");
    expect(createCheckout).toContain('mode: "subscription"');
  });

  it("Pix mensal é Pix-first e não cai para cartão silenciosamente", () => {
    expect(oneTime).toContain("allowCardFallback: false");
    expect(createCheckout).toContain("PIX_UNAVAILABLE");
    expect(guestCheckout).toContain("PIX_UNAVAILABLE");
  });

  it("anual continua card+pix com fallback permitido", () => {
    expect(oneTime).toContain("allowCardFallback: true");
    expect(oneTime).toContain("accessDays: 365");
  });
});

// --- janelas de acesso ----------------------------------------------------

describe("janela de acesso", () => {
  it("Pix mensal concede 30 dias", async () => {
    const { computeAccessWindow } = await import(
      "../../../supabase/functions/_shared/one-time-purchase.ts"
    );
    const paid = new Date("2026-01-10T12:00:00Z");
    const w = computeAccessWindow(paid, null, "monthly_30d");
    expect(w.accessStart).toBe("2026-01-10T12:00:00.000Z");
    expect(w.accessEnd).toBe("2026-02-09T12:00:00.000Z");
  });

  it("nova compra mensal estende a partir do acesso vigente", async () => {
    const { computeAccessWindow } = await import(
      "../../../supabase/functions/_shared/one-time-purchase.ts"
    );
    const w = computeAccessWindow(
      new Date("2026-01-10T00:00:00Z"),
      "2026-02-01T00:00:00.000Z",
      "monthly_30d",
    );
    expect(w.accessEnd).toBe("2026-03-03T00:00:00.000Z");
  });

  it("anual continua somando 12 meses", async () => {
    const { computeAccessWindow } = await import(
      "../../../supabase/functions/_shared/one-time-purchase.ts"
    );
    const w = computeAccessWindow(new Date("2026-01-10T00:00:00Z"), null, "annual_12m");
    expect(w.accessEnd).toBe("2027-01-10T00:00:00.000Z");
  });
});

// --- concessão ------------------------------------------------------------

describe("concessão de acesso", () => {
  const load = () => import("../../../supabase/functions/_shared/one-time-purchase.ts");

  it("completed sem pagamento confirmado NÃO concede", async () => {
    const { shouldGrantOneTimeAccess } = await load();
    expect(shouldGrantOneTimeAccess("checkout.session.completed", {
      id: "cs_1",
      mode: "payment",
      payment_status: "unpaid",
      metadata: { purpose: "monthly_pix_one_time_access" },
    })).toBe(false);
  });

  it("async_payment_succeeded concede", async () => {
    const { shouldGrantOneTimeAccess } = await load();
    expect(shouldGrantOneTimeAccess("checkout.session.async_payment_succeeded", {
      id: "cs_1",
      mode: "payment",
      payment_status: "processing",
      metadata: { purpose: "monthly_pix_one_time_access" },
    })).toBe(true);
  });

  it("purpose desconhecido nunca concede", async () => {
    const { shouldGrantOneTimeAccess } = await load();
    expect(shouldGrantOneTimeAccess("checkout.session.completed", {
      id: "cs_1",
      mode: "payment",
      payment_status: "paid",
      metadata: { purpose: "outra_coisa" },
    })).toBe(false);
  });

  it("reentrega do mesmo evento não duplica (idempotência por session)", () => {
    expect(webhook).toContain('.eq("checkout_session_id", session.id)');
    expect(webhook).toContain('reason: "already_processed"');
    expect(webhook).toContain('if (error.code === "23505") return { granted: false, reason: "duplicate" }');
  });

  it("pagamento confirmado não é rebaixado por evento tardio", () => {
    expect(webhook).toContain('if (existing?.status === "paid") return;');
  });
});

// --- tentativa registrada -------------------------------------------------

describe("registro da tentativa de compra", () => {
  it("checkout cria linha pending/started idempotente", () => {
    expect(attempts).toContain('status: "pending"');
    expect(attempts).toContain('checkout_status: "started"');
    expect(attempts).toContain('onConflict: "checkout_session_id"');
    expect(createCheckout).toContain("recordPurchaseAttempt");
    expect(guestCheckout).toContain("recordPurchaseAttempt");
  });

  it("falha/expiração vira oportunidade de recuperação", async () => {
    const { recoveryStatusForOutcome } = await import(
      "../../../supabase/functions/_shared/one-time-purchase.ts"
    );
    expect(recoveryStatusForOutcome("failed")).toBe("eligible");
    expect(recoveryStatusForOutcome("expired")).toBe("eligible");
    expect(recoveryStatusForOutcome("paid")).toBe("not_needed");
  });

  it("compra paga posterior marca oportunidades como recuperadas", () => {
    expect(webhook).toContain('recovery_status: "recovered"');
  });

  it("método de pagamento real é capturado", async () => {
    const { normalizePaymentMethod } = await import(
      "../../../supabase/functions/_shared/one-time-purchase.ts"
    );
    expect(normalizePaymentMethod(["pix"])).toBe("pix");
    expect(normalizePaymentMethod(["card"])).toBe("card");
    expect(normalizePaymentMethod(undefined)).toBe("unknown");
    expect(webhook).toContain("resolvePaymentMethod");
  });
});

// --- métricas -------------------------------------------------------------

describe("métricas de recuperação", () => {
  it("conversão usa iniciados como denominador e evita zero falso", () => {
    expect(recovery).toContain("conversion_pct: rate(count(pix, (r) => r.status === \"paid\"), pix.length)");
    expect(recovery).toContain("if (!initiated) return null;");
  });

  it("receita avulsa não entra no MRR", () => {
    expect(recovery).toContain("nunca entra no MRR");
    expect(adminList).not.toContain("stripe_one_time_purchases");
  });

  it("endpoint é admin-only", () => {
    expect(recovery).toContain('supabase.rpc("is_staff"');
    expect(recovery).toContain("Forbidden: staff access required");
  });
});

// --- UI -------------------------------------------------------------------

describe("UI de pricing", () => {
  it("mantém CTA principal de assinatura e opção Pix secundária explícita", () => {
    expect(pricing).toContain("Assinar agora");
    expect(pricing).toContain("Pagar 1 mês via Pix");
    expect(pricing).toContain("30 dias de acesso, sem renovação automática");
    expect(pricing).toContain('startCheckout("pix_monthly_30d")');
  });
});
