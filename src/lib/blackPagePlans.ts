import { BLACK_OFFER, PRICE_TABLE } from "@/lib/pricingSchedule";
import type { BlackLeadSource } from "@/lib/blackLead";

/**
 * Planos oferecidos na página /black (decisão do Artur, 02/11/2026):
 * - black: anual Black R$ 399,90, pagamento único (oferta principal);
 * - monthly: mensal recorrente no cartão (R$ 49,90 no lançamento);
 * - annual_arsenal: anual à vista (R$ 499,90 no lançamento) com o bônus Arsenal Med.
 * Os valores saem do calendário de preços; o servidor confere tudo de novo.
 */
export type BlackPagePlanKey = "black" | "monthly" | "annual_arsenal";

export type BlackPagePlan = {
  plan: string;
  billingPeriod: "monthly" | "yearly";
  priceBrl: number;
  leadSource: BlackLeadSource;
};

export const BLACK_PAGE_PLANS: Record<BlackPagePlanKey, BlackPagePlan> = {
  black: {
    plan: BLACK_OFFER.slug,
    billingPeriod: "yearly",
    priceBrl: BLACK_OFFER.amountCents / 100,
    leadSource: "black_checkout",
  },
  monthly: {
    plan: "pro_completo",
    billingPeriod: "monthly",
    priceBrl: PRICE_TABLE.launch.monthlyCents / 100,
    leadSource: "black_page_monthly",
  },
  annual_arsenal: {
    plan: "pro_completo_yearly",
    billingPeriod: "yearly",
    priceBrl: PRICE_TABLE.launch.yearlyCents / 100,
    leadSource: "black_page_annual_arsenal",
  },
};
