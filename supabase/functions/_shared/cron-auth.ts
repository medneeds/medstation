// Trava das funções agendadas (pg_cron → net.http_post).
// Os jobs chamam com a chave anon, que é pública; sem esta trava qualquer
// pessoa com a URL pode disparar a rotina. Import-free para ser testável.
//
// Implantação em duas etapas, sem quebrar os jobs atuais:
//  1. Sem o segredo CRON_SECRET configurado → libera (comportamento de hoje) e avisa no log.
//  2. Com CRON_SECRET configurado → exige o cabeçalho x-cron-secret igual ao segredo.
export const CRON_SECRET_HEADER = "x-cron-secret";

/** Comparação em tempo constante (não vaza o tamanho do prefixo correto). */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export type CronAuthResult = { ok: true; enforced: boolean } | { ok: false };

export function checkCronSecret(headerValue: string | null | undefined, secret: string | null | undefined): CronAuthResult {
  const configured = (secret ?? "").trim();
  if (!configured) return { ok: true, enforced: false };
  const given = (headerValue ?? "").trim();
  if (!given) return { ok: false };
  return timingSafeEqual(given, configured) ? { ok: true, enforced: true } : { ok: false };
}

/** Devolve uma Response 401 quando a chamada não é do agendador; null quando pode seguir. */
export function rejectUnlessCron(req: Request, secret: string | null | undefined, fn: string): Response | null {
  const r = checkCronSecret(req.headers.get(CRON_SECRET_HEADER), secret);
  if (!r.ok) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!r.enforced) console.warn(`[${fn}] CRON_SECRET não configurado: chamada aceita sem trava`);
  return null;
}
