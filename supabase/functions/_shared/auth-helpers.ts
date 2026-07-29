// Helpers de autenticação para edge functions Lovable-managed.
// Extrai o user id do JWT Supabase enviado no header Authorization.
// Retorna null quando não houver ou o token for inválido — não lança.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getUserIdFromAuth(req: Request): Promise<string | null> {
  try {
    const h = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!h) return null;
    const token = h.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await supabase.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Estimativa grosseira de duração de áudio a partir do tamanho em bytes.
 * Assume bitrate típico de webm/opus (~16 kbps → 2 KB/s) e clamp de 1s a 3600s.
 * Usada só quando o provider não devolve duração explícita.
 */
export function estimateAudioSecondsFromBytes(bytes: number, kbps = 16): number {
  const bytesPerSec = (kbps * 1000) / 8;
  const seconds = bytes / bytesPerSec;
  return Math.max(1, Math.min(3600, Math.round(seconds)));
}
