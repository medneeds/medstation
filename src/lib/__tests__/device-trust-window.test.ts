import { describe, it, expect } from "vitest";
import { isTrustStillValid } from "../../../supabase/functions/_shared/device-trust";

const H = 60 * 60 * 1000;
const now = Date.parse("2026-10-29T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("confirmação por e-mail após tempo sem uso", () => {
  it("acesso pessoal: 23h59 sem uso entra sem código", () => {
    expect(isTrustStillValid(ago(24 * H - 60_000), false, now)).toBe(true);
  });

  it("acesso pessoal: 24h sem uso pede o código de novo", () => {
    expect(isTrustStillValid(ago(24 * H), false, now)).toBe(false);
  });

  it("computador compartilhado: 5h59 sem uso entra sem código", () => {
    expect(isTrustStillValid(ago(6 * H - 60_000), true, now)).toBe(true);
  });

  it("computador compartilhado: 6h sem uso pede o código de novo", () => {
    expect(isTrustStillValid(ago(6 * H), true, now)).toBe(false);
  });

  it("aparelho nunca confirmado pede o código", () => {
    expect(isTrustStillValid(null, false, now)).toBe(false);
  });
});

import { amrMethodsFromJwt, isGoogleLogin } from "../../../supabase/functions/_shared/device-trust";

const jwtWith = (payload: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

describe("login com a conta Google não pede código", () => {
  it("sessão aberta pelo Google entra sem código", () => {
    const amr = amrMethodsFromJwt(jwtWith({ amr: [{ method: "oauth", timestamp: 1 }] }));
    expect(isGoogleLogin(amr, ["google"])).toBe(true);
  });

  it("login com senha pede o código, mesmo em conta que também tem Google", () => {
    const amr = amrMethodsFromJwt(jwtWith({ amr: [{ method: "password", timestamp: 1 }] }));
    expect(isGoogleLogin(amr, ["email", "google"])).toBe(false);
  });

  it("conta sem vínculo Google pede o código", () => {
    const amr = amrMethodsFromJwt(jwtWith({ amr: [{ method: "oauth", timestamp: 1 }] }));
    expect(isGoogleLogin(amr, ["email"])).toBe(false);
  });

  it("token ilegível pede o código", () => {
    expect(isGoogleLogin(amrMethodsFromJwt("lixo"), ["google"])).toBe(false);
  });
});
