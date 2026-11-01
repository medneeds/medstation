// Dados da empresa exibidos no rodapé e nas políticas (CDC art. 31, Decreto
// 7.962/2013 art. 2º e LGPD art. 9º). Fonte única: mude aqui e tudo atualiza.
//
// Campos vazios não são exibidos — mas o Decreto 7.962/2013 exige CNPJ,
// endereço e contato em sites de venda. Preencha antes de publicar.

export const COMPANY = {
  brand: "MedStation",
  legalName: "MedNeeds LTDA",
  /** Formato 00.000.000/0000-00 */
  cnpj: "55.595.830/0001-09",
  /** Endereço da sede, com cidade/UF e CEP */
  address: "Rua das Laranjeiras, Q62 C20 - Jardim Renascença",
  /** Canal de atendimento, privacidade (encarregado/DPO) e reembolso */
  contactEmail: "contato@medstation-ai.com.br",
  /** Suporte por WhatsApp (MedNeeds) */
  supportWhatsapp: "(98) 98186-2510",
  supportWhatsappUrl: "https://wa.me/5598981862510",
  /** Encarregado pelo tratamento de dados pessoais (LGPD art. 41) */
  dpoName: "Artur Batista",
  site: "https://medstation-ai.com.br",
} as const;

/** Data da última revisão das políticas — atualize ao mudar o texto. */
export const LEGAL_LAST_UPDATED = "31 de outubro de 2026";

/** Mostra o e-mail de contato ou, se ainda não configurado, o canal no app. */
export function contactLabel(): string {
  return COMPANY.contactEmail || "o suporte dentro da plataforma (menu Ajuda)";
}
