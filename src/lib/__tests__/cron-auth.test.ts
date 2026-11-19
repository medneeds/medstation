import { describe, expect, it } from "vitest";
import { checkCronSecret, rejectUnlessCron, timingSafeEqual } from "../../../supabase/functions/_shared/cron-auth";

describe("cron-auth", () => {
  it("libera sem segredo configurado (etapa 1, não quebra os jobs atuais)", () => {
    expect(checkCronSecret(null, undefined)).toEqual({ ok: true, enforced: false });
    expect(checkCronSecret("qualquer", "   ")).toEqual({ ok: true, enforced: false });
  });
  it("com segredo, exige cabeçalho exato", () => {
    expect(checkCronSecret(null, "s3cr3t")).toEqual({ ok: false });
    expect(checkCronSecret("errado", "s3cr3t")).toEqual({ ok: false });
    expect(checkCronSecret("s3cr3", "s3cr3t")).toEqual({ ok: false });
    expect(checkCronSecret("s3cr3t", "s3cr3t")).toEqual({ ok: true, enforced: true });
  });
  it("comparação em tempo constante", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
  it("devolve 401 para chamada externa quando a trava está ligada", async () => {
    const req = new Request("https://x/functions/v1/f", { method: "POST" });
    const res = rejectUnlessCron(req, "s3cr3t", "f");
    expect(res?.status).toBe(401);
    const ok = new Request("https://x/functions/v1/f", { method: "POST", headers: { "x-cron-secret": "s3cr3t" } });
    expect(rejectUnlessCron(ok, "s3cr3t", "f")).toBeNull();
  });
});
