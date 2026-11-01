// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));
vi.mock("@/lib/analytics", () => ({ trackSubscriptionCompleted: vi.fn() }));

import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  getConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  parseConsent,
  saveConsent,
} from "@/lib/consent";
import { trackPurchaseConversion } from "@/lib/conversion";

describe("consentimento de cookies", () => {
  beforeEach(() => {
    localStorage.clear();
    window.fbq = vi.fn();
    window.__msLoadPixel = vi.fn();
  });

  it("sem decisão salva, nada opcional está liberado", () => {
    expect(getConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(hasMarketingConsent()).toBe(false);
  });

  it("ignora formatos inválidos ou de outra versão", () => {
    expect(parseConsent("lixo")).toBeNull();
    expect(parseConsent(JSON.stringify({ v: 2, analytics: true, marketing: true, decidedAt: "x" }))).toBeNull();
    expect(parseConsent(JSON.stringify({ v: 1, analytics: "sim", marketing: true, decidedAt: "x" }))).toBeNull();
  });

  it("salva a escolha com data e avisa o app", () => {
    const listener = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, listener);
    saveConsent({ analytics: true, marketing: false });
    window.removeEventListener(CONSENT_CHANGED_EVENT, listener);

    const stored = parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY));
    expect(stored).toMatchObject({ v: 1, analytics: true, marketing: false });
    expect(Number.isNaN(Date.parse(stored!.decidedAt))).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("aceitar marketing carrega o Pixel; recusar revoga e não carrega", () => {
    saveConsent({ analytics: false, marketing: false });
    expect(window.__msLoadPixel).not.toHaveBeenCalled();
    expect(window.fbq).toHaveBeenCalledWith("consent", "revoke");

    saveConsent({ analytics: false, marketing: true });
    expect(window.__msLoadPixel).toHaveBeenCalledWith(true);
    expect(window.fbq).toHaveBeenCalledWith("consent", "grant");
  });

  it("compra não é enviada ao Meta sem consentimento de marketing", () => {
    saveConsent({ analytics: true, marketing: false });
    (window.fbq as ReturnType<typeof vi.fn>).mockClear();
    trackPurchaseConversion({ transactionId: "t_sem_consent", value: 399.9 });
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("compra é enviada ao Meta com consentimento de marketing", () => {
    saveConsent({ analytics: false, marketing: true });
    (window.fbq as ReturnType<typeof vi.fn>).mockClear();
    trackPurchaseConversion({ transactionId: "t_com_consent", value: 399.9 });
    expect(window.fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      expect.objectContaining({ value: 399.9 }),
      { eventID: "t_com_consent" },
    );
  });
});
