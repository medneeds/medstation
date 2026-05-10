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
    UPGRADE_FROM_AGENTS: {
      priceId: "price_1TVgZ8ACiwQRloW4WfmIx87N",
      productId: "prod_UUfu9AzBtaGsCW",
      price: 19.90,
    },
  },
  PRO2_BUNDLE: {
    MONTHLY: {
      priceId: "price_1TVga8ACiwQRloW4fPGUzAF9",
      productId: "prod_UUfw2uz4UPwkco",
      price: 49.90,
    },
  },
} as const;

// All product IDs that grant access to "agents" capability
export const AGENTS_PRODUCT_IDS = [
  "prod_TgR7u5urUle7om", // Agents standalone
  "prod_UUfvAeta3d1Rn5", // Agents upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
];

// All product IDs that grant access to "consultório" capability
export const CONSULTORIO_PRODUCT_IDS = [
  "prod_UUfuDkH9yfcfb3", // Consultório standalone
  "prod_UUfu9AzBtaGsCW", // Consultório upgrade
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle
];

export const PRODUCT_IDS = {
  AGENTS: "prod_TgR7u5urUle7om",
  CONSULTORIO: "prod_UUfuDkH9yfcfb3",
  PRO2_BUNDLE: "prod_UUfw2uz4UPwkco",
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
  | "consultorio_upgrade"
  | "pro2_bundle";
