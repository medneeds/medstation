// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

import { trackPageView } from "@/lib/analytics";
import { CONSENT_STORAGE_KEY } from "@/lib/consent";

function grantMarketing(marketing: boolean) {
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ v: 1, analytics: false, marketing, decidedAt: new Date().toISOString() }),
  );
}

describe("Meta PageView da primeira tela", () => {
  beforeEach(() => {
    window.fbq = vi.fn();
    window.__msInitialPixelPageView = undefined;
    grantMarketing(true);
  });

  it("não duplica o PageView que já saiu do index.html", async () => {
    window.__msInitialPixelPageView = "/";
    await trackPageView("/");
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("envia o PageView da navegação seguinte normalmente", async () => {
    window.__msInitialPixelPageView = "/";
    await trackPageView("/");
    await trackPageView("/pricing");
    expect(window.fbq).toHaveBeenCalledTimes(1);
    expect(window.fbq).toHaveBeenCalledWith("track", "PageView");
  });

  it("envia o PageView quando o index.html não enviou nada", async () => {
    await trackPageView("/");
    expect(window.fbq).toHaveBeenCalledTimes(1);
  });

  it("não envia nada ao Meta sem consentimento de marketing", async () => {
    grantMarketing(false);
    await trackPageView("/pricing");
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("não envia nada ao Meta antes de o visitante decidir", async () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    await trackPageView("/pricing");
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("nunca envia ao Meta a página de confirmação, que pode ter o e-mail na URL", async () => {
    await trackPageView("/confirmar-email");
    expect(window.fbq).not.toHaveBeenCalled();
  });

  it("não envia nada ao Meta se a URL atual tiver e-mail", async () => {
    window.history.replaceState(null, "", "/auth?email=fulano%40exemplo.com");
    await trackPageView("/pricing");
    expect(window.fbq).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/");
  });
});
