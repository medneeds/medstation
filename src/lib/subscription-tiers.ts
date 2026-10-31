import { currentPriceCents, pricePhase, PRICE_TABLE } from "./pricingSchedule";

// Stripe Product and Price IDs - LIVE MODE (Produção)
export const SUBSCRIPTION_TIERS = {
  AGENTS: {
    MONTHLY: {
      priceId: "price_1Sj4FbACiwQRloW42xp6WqYH",
      productId: "prod_TgR7u5urUle7om",
      price: 29.90,
    },
    YEARLY: {
      priceId: "price_1TVe5RACiwQRloW4KsjZ5QsK",
      productId: "prod_TgR7u5urUle7om",
      price: 299.90,
    },
    UPGRADE_FROM_CONSULTORIO: {
      priceId: "price_1TVgZWACiwQRloW4VxjohmIG",
      productId: "prod_UUfvAeta3d1Rn5",
      price: 19.90,
    },
  },
  CONSULTORIO: {
    MONTHLY: {
      priceId: "price_1TVgYdACiwQRloW4w2R2GJ2i",
      productId: "prod_UUfuDkH9yfcfb3",
      price: 29.90,
    },
    YEARLY: {
      priceId: "price_1TVgq1ACiwQRloW4w3EKIaBC",
      productId: "prod_UUfuDkH9yfcfb3",
      price: 299.90,
    },
    UPGRADE_FROM_AGENTS: {
      priceId: "price_1TVgZ8ACiwQRloW4WfmIx87N",
      productId: "prod_UUfu9AzBtaGsCW",
      price: 19.90,
    },
  },
  // Plano único vigente: MedStation Completo (tudo incluso)
  PRO_COMPLETO: {
    MONTHLY: {
      priceId: "price_1U4Zo7ACiwQRloW4cJIn0jYn",
      productId: "prod_V4jGKeBPH2hGYg",
      price: 49.90,
    },
    YEARLY: {
      priceId: "price_1U4ZoTACiwQRloW4f30FmEPb",
      productId: "prod_V4jGKeBPH2hGYg",
      price: 499.90,
    },
  },
  PRO2_BUNDLE: {
    MONTHLY: {
      priceId: "price_1TVga8ACiwQRloW4fPGUzAF9",
      productId: "prod_UUfw2uz4UPwkco",
      price: 49.90,
    },
    YEARLY: {
      priceId: "price_1TVgqWACiwQRloW4BwMkM74x",
      productId: "prod_UUfw2uz4UPwkco",
      price: 499.90,
    },
  },
} as const;

// All product IDs that grant access to "agents" capability
export const AGENTS_PRODUCT_IDS = [
  "prod_TgR7u5urUle7om", // Agents standalone
  "prod_UUfvAeta3d1Rn5", // Agents upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
  "prod_V4BACwTTBf5tBk", // Pro Completo (legado 99,90)
  "prod_V4jGKeBPH2hGYg", // MedStation Completo (plano único)
];

// All product IDs that grant access to "consultório" capability
export const CONSULTORIO_PRODUCT_IDS = [
  "prod_UUfuDkH9yfcfb3", // Consultório standalone
  "prod_UUfu9AzBtaGsCW", // Consultório upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
  "prod_V4BACwTTBf5tBk", // Pro Completo (legado 99,90)
  "prod_V4jGKeBPH2hGYg", // MedStation Completo (plano único)
];

export const PRODUCT_IDS = {
  AGENTS: "prod_TgR7u5urUle7om",
  CONSULTORIO: "prod_UUfuDkH9yfcfb3",
  PRO2_BUNDLE: "prod_UUfw2uz4UPwkco",
  PRO_COMPLETO: "prod_V4jGKeBPH2hGYg",
  PRO_COMPLETO_LEGACY: "prod_V4BACwTTBf5tBk",
};

export function hasAgentsAccess(productIds: string[]): boolean {
  return productIds.some((id) => AGENTS_PRODUCT_IDS.includes(id));
}

export function hasConsultorioAccess(productIds: string[]): boolean {
  return productIds.some((id) => CONSULTORIO_PRODUCT_IDS.includes(id));
}

// Plan slugs accepted by the checkout edge functions
export type PlanSlug =
  | "agents_monthly"
  | "agents_yearly"
  | "agents_upgrade"
  | "consultorio_monthly"
  | "consultorio_yearly"
  | "consultorio_upgrade"
  | "pro2_bundle"
  | "pro2_bundle_yearly"
  | "pro_completo"
  | "pro_completo_yearly"
  // Compra avulsa de 30 dias via Pix, sem renovação automática.
  | "pix_monthly_30d"
  // Black MedStation: anual à vista só em novembro/2026.
  | "black_anual_2026";

/**
 * Preços de exibição nas landing pages.
 * `list` é o valor de referência (ancoragem) e `now` é o valor efetivamente cobrado hoje.
 * Alterar `now` exige criar o preço correspondente no provedor de pagamento.
 */
const PHASE_PRICES = currentPriceCents();

/** true enquanto vale o preço de lançamento (até 30/11/2026, horário de Brasília). */
export const HAS_LAUNCH_DISCOUNT = pricePhase() === "launch";

export const DISPLAY_PRICING = {
  bundle: {
    monthly: { list: PRICE_TABLE.full.monthlyCents / 100, now: PHASE_PRICES.monthlyCents / 100 },
    yearly: { list: PRICE_TABLE.full.yearlyCents / 100, now: PHASE_PRICES.yearlyCents / 100 },
  },
  agents: {
    monthly: { list: 89.9, now: 29.9 },
    yearly: { list: 899.0, now: 299.9 },
  },
  consultorio: {
    monthly: { list: 129.9, now: 29.9 },
    yearly: { list: 1299.0, now: 299.9 },
  },
} as const;

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

/** Frase curta com os preços vigentes do plano único, para avisos e telas de bloqueio. */
export const PRICE_SUMMARY = `${brl(DISPLAY_PRICING.bundle.monthly.now)}/mês ou ${brl(DISPLAY_PRICING.bundle.yearly.now)}/ano`;
