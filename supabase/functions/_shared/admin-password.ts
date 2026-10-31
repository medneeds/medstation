/**
 * Rules for a password set directly by an admin (support cases where the
 * confirmation or reset e-mail never arrives). No imports on purpose so the
 * rule stays testable from vitest.
 */

export const ADMIN_PASSWORD_MIN = 8;
export const ADMIN_PASSWORD_MAX = 72;

/** Returns a message in Portuguese when the password is not acceptable, or null when it is. */
export function adminPasswordProblem(password: unknown, email = ""): string | null {
  if (typeof password !== "string" || password.length === 0) return "Digite a nova senha.";
  if (password !== password.trim()) return "A senha não pode começar nem terminar com espaço.";
  if (password.length < ADMIN_PASSWORD_MIN) return `A senha precisa ter pelo menos ${ADMIN_PASSWORD_MIN} caracteres.`;
  if (password.length > ADMIN_PASSWORD_MAX) return `A senha pode ter no máximo ${ADMIN_PASSWORD_MAX} caracteres.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letras e números na senha.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    return "A senha não pode conter o e-mail do usuário.";
  }
  return null;
}
