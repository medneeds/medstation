// Identificação do aparelho e marcadores do login protegido.
const DEVICE_KEY = "ms_device_id";
const SHARED_KEY = "ms_shared_device";
const SHARED_ALIVE_KEY = "ms_shared_alive";
const FRESH_KEY = "ms_fresh_login";
const OK_PREFIX = "ms_dg_ok:";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getDeviceId(): string {
  return safe(() => {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[a-zA-Z0-9-]{16,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }, "00000000-0000-0000-0000-000000000000");
}

export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iPhone/iPad"
        : /Mac OS/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "outro sistema";
  return `${browser} no ${os}`;
}

export async function deviceHashFor(userId: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userId}:${getDeviceId()}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Chamado logo após um login bem-sucedido (senha ou Google). */
export function markFreshLogin(shared: boolean) {
  safe(() => {
    sessionStorage.setItem(FRESH_KEY, "1");
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(OK_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
    if (shared) {
      localStorage.setItem(SHARED_KEY, "1");
      sessionStorage.setItem(SHARED_ALIVE_KEY, "1");
      localStorage.setItem("ms_shared_beat", String(Date.now()));
    } else {
      localStorage.removeItem(SHARED_KEY);
      localStorage.removeItem("ms_shared_beat");
      sessionStorage.removeItem(SHARED_ALIVE_KEY);
    }
  }, undefined);
}

export function isFreshLogin() {
  return safe(() => sessionStorage.getItem(FRESH_KEY) === "1", false);
}
export function clearFreshLogin() {
  safe(() => sessionStorage.removeItem(FRESH_KEY), undefined);
}

export function isSharedDevice() {
  return safe(() => localStorage.getItem(SHARED_KEY) === "1", false);
}
/**
 * Regra do login: a tela sempre abre como "computador compartilhado".
 * Não herda a escolha anterior, para um computador de hospital nunca abrir
 * como pessoal só porque outro médico desmarcou antes.
 */
export const SHARED_BY_DEFAULT = true;
export function getSharedPreference() {
  return SHARED_BY_DEFAULT;
}

/** Abas abertas renovam este sinal; se ficar parado, o navegador foi fechado. */
export const SHARED_BEAT_KEY = "ms_shared_beat";
export const SHARED_BEAT_MS = 20_000;
export const SHARED_STALE_MS = 3 * 60_000;

/** Marca que há uma aba viva neste computador compartilhado. */
export function touchSharedBeat() {
  safe(() => {
    if (localStorage.getItem(SHARED_KEY) !== "1") return;
    if (sessionStorage.getItem(SHARED_ALIVE_KEY) !== "1") return;
    localStorage.setItem(SHARED_BEAT_KEY, String(Date.now()));
  }, undefined);
}

/**
 * Computador compartilhado: navegador foi fechado e reaberto?
 * Uma aba nova enquanto outra continua aberta herda a sessão viva.
 */
export function sharedSessionExpired(now = Date.now()) {
  return safe(() => {
    if (localStorage.getItem(SHARED_KEY) !== "1") return false;
    if (sessionStorage.getItem(SHARED_ALIVE_KEY) === "1") return false;
    const beat = Number(localStorage.getItem(SHARED_BEAT_KEY) || 0);
    if (beat && now - beat < SHARED_STALE_MS) {
      sessionStorage.setItem(SHARED_ALIVE_KEY, "1");
      return false;
    }
    return true;
  }, false);
}

export function isDeviceOk(userId: string) {
  return safe(() => sessionStorage.getItem(OK_PREFIX + userId) === "1", false);
}
export function setDeviceOk(userId: string) {
  safe(() => sessionStorage.setItem(OK_PREFIX + userId, "1"), undefined);
}
export function clearDeviceState() {
  safe(() => {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(OK_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
    localStorage.removeItem(SHARED_KEY);
    localStorage.removeItem("ms_shared_beat");
    sessionStorage.removeItem(SHARED_ALIVE_KEY);
  }, undefined);
}
