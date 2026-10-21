import { describe, it, expect, beforeEach } from "vitest";
import { markFreshLogin, sharedSessionExpired, SHARED_STALE_MS } from "@/lib/deviceGuard";

describe("computador compartilhado", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("aba nova com outra aba aberta continua logada", () => {
    markFreshLogin(true);
    sessionStorage.clear(); // simula aba nova
    expect(sharedSessionExpired()).toBe(false);
  });

  it("navegador reaberto depois de 3 minutos sem abas encerra a sessão", () => {
    markFreshLogin(true);
    sessionStorage.clear();
    expect(sharedSessionExpired(Date.now() + SHARED_STALE_MS + 1000)).toBe(true);
  });

  it("login normal apaga a marca de compartilhado", () => {
    markFreshLogin(true);
    markFreshLogin(false);
    sessionStorage.clear();
    expect(sharedSessionExpired()).toBe(false);
  });
});
