// Contato manual pelo painel da Black: link do WhatsApp com mensagem pronta.

export type BlackContactKind = "vip" | "abandoned" | "boleto";

export const BLACK_URL = "https://medstation-ai.com.br/black";

/** Telefone brasileiro em formato do wa.me (55 + DDD + número). Null se não der para usar. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

export function blackWhatsappMessage(kind: BlackContactKind, link?: string | null): string {
  if (kind === "vip") {
    return `Olá! Aqui é da MedStation. A Black abriu: o plano anual está por R$ 399,90 (12 meses, cartão em até 12x ou boleto), só até 30/11. Garanta o seu: ${BLACK_URL}`;
  }
  if (kind === "boleto") {
    return `Olá! Aqui é da MedStation. Seu boleto do plano anual ainda está em aberto. Se precisar, é este: ${link ?? BLACK_URL}. O acesso libera assim que o banco confirmar.`;
  }
  return `Olá! Aqui é da MedStation. Vi que você começou a assinar a Black e não concluiu. Posso ajudar em algo? Para retomar: ${link ?? BLACK_URL}`;
}
