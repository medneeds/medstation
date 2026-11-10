// Regra de confiança do aparelho (sem dependências, testada no app).
// O código por e-mail só volta a ser pedido depois de um período SEM USO
// naquele computador: 24 h no acesso pessoal e 6 h no compartilhado.

export const TRUST_PERSONAL_HOURS = 24
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

/**
 * Métodos de entrada gravados no token da sessão (claim "amr").
 * Lê só o conteúdo de um token que o servidor já validou.
 */
export function amrMethodsFromJwt(token: string | null | undefined): string[] {
  try {
    const payload = String(token ?? '').split('.')[1]
    if (!payload) return []
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const data = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    if (!Array.isArray(data?.amr)) return []
    return data.amr
      .map((a: unknown) => (typeof a === 'string' ? a : (a as { method?: unknown })?.method))
      .filter((m: unknown): m is string => typeof m === 'string')
  } catch {
    return []
  }
}

/**
 * Entrou com a conta Google? Então não pede o código por e-mail:
 * o próprio Google já confirmou que é o médico.
 * Exige as duas coisas: sessão aberta por OAuth e conta com vínculo Google.
 */
export function isGoogleLogin(amrMethods: string[], providers: unknown): boolean {
  const list = Array.isArray(providers) ? providers : []
  return amrMethods.includes('oauth') && list.includes('google')
}
