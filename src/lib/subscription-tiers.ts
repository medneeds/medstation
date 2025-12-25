// Stripe Product and Price IDs - Sincronizado com Stripe Dashboard
export const SUBSCRIPTION_TIERS = {
  // Plano Base - Agentes Médicos (MedStation AI Pro)
  AGENTS: {
    MONTHLY: {
      priceId: "price_1SVf3KArMslBEVDuydWkh06x",
      productId: "prod_TICcLVsZgxl5bT",
      price: 19.90,
    },
    YEARLY: {
      priceId: "price_1SVf3KArMslBEVDur219MGI8",
      productId: "prod_TICcLVsZgxl5bT",
      price: 199.90,
    },
  },
  // Studius Standalone
  STUDIUS: {
    MONTHLY: {
      priceId: "price_1ShpkPArMslBEVDunZrz3tZO",
      productId: "prod_TfA4LZsza2MSIa",
      price: 19.90,
    },
  },
  // Studius Add-on (50% off para quem já tem plano base)
  STUDIUS_ADDON: {
    MONTHLY: {
      priceId: "price_1ShpkiArMslBEVDu0Qsz2E1k",
      productId: "prod_TfA4jhJqGKI5Gn",
      price: 9.90,
    },
  },
} as const;

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
  const studiusProducts: string[] = [
    SUBSCRIPTION_TIERS.STUDIUS.MONTHLY.productId,
    SUBSCRIPTION_TIERS.STUDIUS_ADDON.MONTHLY.productId,
  ];
  return productIds.some(id => studiusProducts.includes(id));
}

// Helper para verificar se o usuário tem o plano base
export function hasAgentsAccess(productIds: string[]): boolean {
  return productIds.includes(SUBSCRIPTION_TIERS.AGENTS.MONTHLY.productId);
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
