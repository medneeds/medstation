// Estado da legenda ao vivo (ElevenLabs). Quando o saldo do serviço acaba,
// não adianta reconectar: a gravação segue sozinha e o texto vem da cópia
// gravada. Guardamos a pausa por um tempo para as próximas gravações já
// começarem direto pela cópia, sem a espera de "Conectando…".

export const LIVE_PAUSE_AFTER_QUOTA_MS = 15 * 60 * 1000;
const KEY = "ms_live_voice_paused_until";

let memoryPausedUntil = 0;

function readStored(): number {
  try {
    if (typeof sessionStorage === "undefined") return 0;
    return Number(sessionStorage.getItem(KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function markLiveVoiceUnavailable(now: number = Date.now()): void {
  memoryPausedUntil = now + LIVE_PAUSE_AFTER_QUOTA_MS;
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(KEY, String(memoryPausedUntil));
  } catch {
    /* no-op */
  }
}

export function isLiveVoicePaused(now: number = Date.now()): boolean {
  return Math.max(memoryPausedUntil, readStored()) > now;
}

export function clearLiveVoicePause(): void {
  memoryPausedUntil = 0;
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

/** Erros do serviço ao vivo que reconectar não resolve (saldo, chave, termos). */
export function isPermanentLiveError(err: unknown): boolean {
  const text = (() => {
    if (!err) return "";
    if (typeof err === "string") return err;
    const anyErr = err as { message?: unknown; error?: unknown; reason?: unknown };
    return [anyErr.message, anyErr.error, anyErr.reason].filter((v) => typeof v === "string").join(" ");
  })().toLowerCase();
  return /quota|credits? remaining|auth_error|unauthorized|invalid api key|unaccepted_terms/.test(text);
}
