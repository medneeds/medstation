// Regra de confiança do aparelho (sem dependências, testada no app).
// O código por e-mail só volta a ser pedido depois de um período SEM USO
// naquele computador: 12 h no acesso pessoal e 6 h no compartilhado.

export const TRUST_PERSONAL_HOURS = 12
export const TRUST_SHARED_HOURS = 6

/** Atualiza a marca de uso no máximo a cada 5 min enquanto há movimento. */
export const TRUST_TOUCH_MS = 5 * 60 * 1000

export function trustWindowMs(shared: boolean): number {
  return (shared ? TRUST_SHARED_HOURS : TRUST_PERSONAL_HOURS) * 60 * 60 * 1000
}

/** Último uso que ainda dispensa o código, para o modo escolhido no login. */
export function trustCutoffIso(shared: boolean, now = Date.now()): string {
  return new Date(now - trustWindowMs(shared)).toISOString()
}

/** Validade gravada junto ao aparelho (informativa; a decisão usa o último uso). */
export function trustExpiresIso(shared: boolean, now = Date.now()): string {
  return new Date(now + trustWindowMs(shared)).toISOString()
}

/** Este aparelho entra sem código? */
export function isTrustStillValid(lastUsedAt: string | null | undefined, shared: boolean, now = Date.now()): boolean {
  if (!lastUsedAt) return false
  const last = new Date(lastUsedAt).getTime()
  if (!Number.isFinite(last)) return false
  return now - last < trustWindowMs(shared)
}
