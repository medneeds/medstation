/**
 * Bônus exclusivo do plano anual: Arsenal Med 3.0.
 *
 * Fonte única de verdade para a comunicação do bônus (landing, página de
 * preços e área logada). Nada aqui depende de backend.
 */

export const ANNUAL_BONUS = {
  name: "Arsenal Med 3.0",
  tagline: "Manual do paciente grave + catálogo de fármacos e tabelas",
  /** Valor de venda avulsa, usado como ancoragem. */
  valueCents: 9990,
  valueLabel: "R$ 99,90",
  siteUrl: "https://arsenalmed.com.br",
  accessUrl: "https://arsenalmed.com.br/entrar",
  supportEmail: "suporte@arsenalmed.com.br",
  items: [
    "33 cenários do paciente grave: via aérea, PCR, choque, sepse, AVC, intoxicações e mais",
    "Catálogo de fármacos com diluição, concentração final, dose por quilo e ajuste renal",
    "Dez tabelas de bolso: vasoativos por peso, antídotos, sedação, ventilação e Portaria 344",
    "Arquivos para consulta off-line no celular, tablet ou computador",
  ],
  /** Como o assinante recebe. */
  deliveryShort:
    "Enviado por e-mail após a confirmação do pagamento anual. O acesso é liberado no painel do Arsenal Med com o mesmo e-mail da assinatura.",
  deliveryDetailed:
    "Você recebe um e-mail com as instruções logo após a confirmação do pagamento anual. O acesso é liberado no painel do Arsenal Med usando exatamente o mesmo e-mail da sua assinatura MedStation.",
} as const;

export const ANNUAL_BONUS_HEADLINE = `Bônus do plano anual: ${ANNUAL_BONUS.name} (${ANNUAL_BONUS.valueLabel}) incluso`;
