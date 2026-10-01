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
    } else {
      localStorage.removeItem(SHARED_KEY);
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
export function getSharedPreference() {
  return isSharedDevice();
}

/** Computador compartilhado: navegador foi fechado e reaberto? */
export function sharedSessionExpired() {
  return safe(
    () => localStorage.getItem(SHARED_KEY) === "1" && sessionStorage.getItem(SHARED_ALIVE_KEY) !== "1",
    false,
  );
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
    sessionStorage.removeItem(SHARED_ALIVE_KEY);
  }, undefined);
}
