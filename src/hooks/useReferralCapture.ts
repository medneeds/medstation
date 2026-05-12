import { useEffect } from "react";

const KEY = "medstation_ref_code";
const EXPIRY_KEY = "medstation_ref_expiry";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Captura ?ref= da URL e armazena por 30 dias. */
export function useReferralCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Z0-9]{4,12}$/i.test(ref)) {
        localStorage.setItem(KEY, ref.toUpperCase());
        localStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
      }
    } catch {
      /* ignore */
    }
  }, []);
}

export function getStoredReferralCode(): string | null {
  try {
    const code = localStorage.getItem(KEY);
    const exp = Number(localStorage.getItem(EXPIRY_KEY) || 0);
    if (!code) return null;
    if (exp && Date.now() > exp) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    /* ignore */
  }
}
