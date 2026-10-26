// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

import { trackPageView } from "@/lib/analytics";

describe("Meta PageView da primeira tela", () => {
  beforeEach(() => {
    window.fbq = vi.fn();
    window.__msInitialPixelPageView = undefined;
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
});
