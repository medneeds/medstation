// Stripe Product and Price IDs - LIVE MODE (Produção)
export const SUBSCRIPTION_TIERS = {
  // Plano Base - MedStation AI
  AGENTS: {
    MONTHLY: {
      priceId: "price_1Sj4FbACiwQRloW42xp6WqYH",
      productId: "prod_TgR7u5urUle7om",
      price: 29.90,
    },
    YEARLY: {
      priceId: "price_1Sj4GKACiwQRloW4QCtEvley",
      productId: "prod_TgR7u5urUle7om",
      price: 199.90,
    },
  },
  // Studius AI - Standalone
  STUDIUS: {
    MONTHLY: {
      priceId: "price_1Sj4CcACiwQRloW4CnXg7srB",
      productId: "prod_TgR45WSvugMwLt",
      price: 29.90,
    },
    YEARLY: {
      priceId: "price_1Sj4EnACiwQRloW4DnrpE1Xg",
      productId: "prod_TgR45WSvugMwLt",
      price: 199.90,
    },
  },
  // Studius Add-on (50% off para quem já tem MedStation AI)
  STUDIUS_ADDON: {
    MONTHLY: {
      priceId: "price_1Sj4CcACiwQRloW4CnXg7srB",
      productId: "prod_TgR45WSvugMwLt",
      price: 9.90,
    },
    YEARLY: {
      priceId: "price_1Sj4EnACiwQRloW4DnrpE1Xg",
      productId: "prod_TgR45WSvugMwLt",
      price: 99.90,
    },
  },
} as const;

// Product IDs for subscription checks
export const PRODUCT_IDS = {
  AGENTS: "prod_TgR7u5urUle7om",
  STUDIUS: "prod_TgR45WSvugMwLt",
};

// Limites Freemium do Studius
export const STUDIUS_LIMITS = {
  FREE: {
    flashcards: 10,
    quizzes: 3,
    chatMessages: 5,
  },
  PREMIUM: {
    flashcards: Infinity,
    quizzes: Infinity,
    chatMessages: Infinity,
  },
} as const;

// Helper para verificar se o usuário tem acesso ao Studius
export function hasStudiusAccess(productIds: string[]): boolean {
  return productIds.includes(PRODUCT_IDS.STUDIUS);
}

// Helper para verificar se o usuário tem o plano base
export function hasAgentsAccess(productIds: string[]): boolean {
  return productIds.includes(PRODUCT_IDS.AGENTS);
}

// Helper para obter o preço do Studius baseado no status
export function getStudiusPrice(hasAgentsPlan: boolean): { price: number; priceId: string } {
  if (hasAgentsPlan) {
    return {
      price: SUBSCRIPTION_TIERS.STUDIUS_ADDON.MONTHLY.price,
      priceId: SUBSCRIPTION_TIERS.STUDIUS_ADDON.MONTHLY.priceId,
    };
  }
  return {
    price: SUBSCRIPTION_TIERS.STUDIUS.MONTHLY.price,
    priceId: SUBSCRIPTION_TIERS.STUDIUS.MONTHLY.priceId,
  };
}
