import { describe, it, expect } from "vitest";
import { isTrustStillValid } from "../../../supabase/functions/_shared/device-trust";

const H = 60 * 60 * 1000;
const now = Date.parse("2026-10-29T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("confirmação por e-mail após tempo sem uso", () => {
  it("acesso pessoal: 11h59 sem uso entra sem código", () => {
    expect(isTrustStillValid(ago(12 * H - 60_000), false, now)).toBe(true);
  });

  it("acesso pessoal: 12h sem uso pede o código de novo", () => {
    expect(isTrustStillValid(ago(12 * H), false, now)).toBe(false);
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
