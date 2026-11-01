import { describe, expect, it } from "vitest";
import { friendlyCheckoutError, suggestEmailFix } from "../blackCheckout";
import { utmMetadata } from "../../../supabase/functions/_shared/meta-capi";

describe("formulário de compra da Black", () => {
  it("sugere a correção de domínios digitados errado", () => {
    expect(suggestEmailFix("Medico@Gmial.com ")).toBe("medico@gmail.com");
    expect(suggestEmailFix("dra@hotmal.com")).toBe("dra@hotmail.com");
    expect(suggestEmailFix("dr@gmail.com")).toBeNull();
    expect(suggestEmailFix("sem-arroba")).toBeNull();
  });

  it("nunca mostra erro técnico em inglês", () => {
    expect(friendlyCheckoutError("Edge Function returned a non-2xx status code")).toContain("WhatsApp");
    expect(friendlyCheckoutError("Invalid request: stripe")).toContain("Não conseguimos");
    expect(friendlyCheckoutError(undefined)).toContain("Não conseguimos");
    expect(friendlyCheckoutError("A Black MedStation terminou.")).toBe("A Black MedStation terminou.");
  });

  it("leva só as UTMs conhecidas para o Stripe", () => {
    expect(utmMetadata({ utm_source: "meta", utm_campaign: " black ", email: "x@y.com", utm_term: 3 })).toEqual({
      utm_source: "meta",
      utm_campaign: "black",
    });
    expect(utmMetadata(null)).toEqual({});
    expect(utmMetadata({ utm_content: "a".repeat(300) }).utm_content).toHaveLength(100);
  });
});

import { shouldShowBlackInApp } from "@/components/BlackInAppOffer";

describe("banner da Black dentro da plataforma", () => {
  const base = { isAnnual: false, status: "active" as const };
  it("aparece para teste, teste vencido, mensal e cortesia", () => {
    for (const accessStatus of ["trial_active", "trial_expired", "none", "paid_active", "past_due", "courtesy_active"] as const) {
      expect(shouldShowBlackInApp({ ...base, accessStatus })).toBe(true);
    }
  });
  it("não aparece para anual, admin, fora de novembro ou enquanto carrega", () => {
    expect(shouldShowBlackInApp({ ...base, accessStatus: "paid_active", isAnnual: true })).toBe(false);
    expect(shouldShowBlackInApp({ ...base, accessStatus: "admin" })).toBe(false);
    expect(shouldShowBlackInApp({ ...base, accessStatus: "trial_active", status: "ended" })).toBe(false);
    expect(shouldShowBlackInApp({ ...base, accessStatus: "trial_active", loading: true })).toBe(false);
  });
});
