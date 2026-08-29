/**
 * Disparo do e-mail de boas-vindas/teste de 7 dias.
 *
 * A idempotência real vive no servidor (tabela user_lifecycle_email_events).
 * Aqui só evitamos chamadas repetidas desnecessárias na mesma aba/usuário.
 */

const STORAGE_PREFIX = "medstation:welcome-email:";

export function welcomeStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

/** Retorna true se ainda vale a pena chamar o servidor para este usuário. */
export function shouldAttemptWelcome(
  userId: string | undefined | null,
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  if (!userId) return false;
  if (!storage) return true;
  try {
    return storage.getItem(welcomeStorageKey(userId)) === null;
  } catch {
    return true;
  }
}

/** Marca localmente que o servidor já resolveu o caso deste usuário. */
export function markWelcomeAttempted(
  userId: string,
  storage: Pick<Storage, "setItem"> | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(welcomeStorageKey(userId), "1");
  } catch {
    /* storage indisponível: o servidor continua sendo a fonte de verdade */
  }
}

/**
 * Decide se a resposta do servidor é definitiva (não vale tentar de novo
 * nesta aba). Falhas transitórias devem permitir nova tentativa.
 */
export function isTerminalWelcomeResult(
  reason: string | undefined,
  errored: boolean,
): boolean {
  if (errored) return false;
  return (
    reason === "sent" ||
    reason === "already_sent" ||
    reason === "not_a_new_signup" ||
    reason === "recipient_suppressed"
  );
}
