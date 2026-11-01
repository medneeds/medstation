// Ajudas do formulário de compra da Black: sugestão para e-mail digitado
// errado, mensagem de erro em português e o e-mail lembrado para quem volta
// do Stripe sem pagar. Funções puras (exceto as de armazenamento) para teste.

const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.com.br": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "yahoo.com.b": "yahoo.com.br",
  "yaho.com.br": "yahoo.com.br",
  "yahoo.con.br": "yahoo.com.br",
  "icloud.co": "icloud.com",
  "icoud.com": "icloud.com",
  "uol.com": "uol.com.br",
};

/** Sugere o e-mail corrigido quando o domínio parece um erro comum de digitação. */
export function suggestEmailFix(email: string): string | null {
  const clean = email.trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at < 1) return null;
  const fix = DOMAIN_FIXES[clean.slice(at + 1)];
  return fix ? `${clean.slice(0, at)}@${fix}` : null;
}

const TECHNICAL = /stripe|invalid|error|failed|exception|unauthorized|fetch|network|timeout|edge function|non-2xx|status code/i;

/** Mensagem que o médico vê quando o pagamento não abre. Nunca mostra erro técnico em inglês. */
export function friendlyCheckoutError(message: string | null | undefined): string {
  const text = (message ?? "").trim();
  if (!text || TECHNICAL.test(text) || text.length > 160) {
    return "Não conseguimos abrir o pagamento agora. Tente de novo em instantes ou fale com o Artur no WhatsApp, no botão verde.";
  }
  return text;
}

const EMAIL_KEY = "ms_black_email";

export function rememberCheckoutEmail(email: string) {
  try {
    sessionStorage.setItem(EMAIL_KEY, email.trim());
  } catch {
    /* noop */
  }
}

export function readRememberedEmail(): string {
  try {
    return sessionStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
