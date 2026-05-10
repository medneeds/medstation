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
  },
} as const;

export const PRODUCT_IDS = {
  AGENTS: "prod_TgR7u5urUle7om",
};

export function hasAgentsAccess(productIds: string[]): boolean {
  return productIds.includes(PRODUCT_IDS.AGENTS);
}
