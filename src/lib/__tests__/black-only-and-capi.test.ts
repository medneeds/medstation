import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { BLACK_ONLY_PATHS, blackOnlyRedirect } from "../blackOnly";
import { BLACK_OFFER } from "../pricingSchedule";
import {
  buildPurchasePayload,
  sendPurchaseToMeta,
  sha256Hex,
  shouldSendPurchase,
  trackingMetadata,
} from "../../../supabase/functions/_shared/meta-capi";

const OCT_31_2359_BRT = new Date("2026-11-01T02:59:00.000Z");
const NOV_10 = new Date("2026-11-10T15:00:00.000Z");
const DEC_01_0000_BRT = new Date("2026-12-01T03:00:00.000Z");

describe("novembro só com a Black", () => {
  it("leva as páginas de venda para /black mantendo UTM e hash", () => {
    expect(blackOnlyRedirect({ pathname: "/", search: "?utm_source=meta", hash: "#x" }, { now: NOV_10 }))
      .toBe("/black?utm_source=meta#x");
    expect(blackOnlyRedirect({ pathname: "/pricing/" }, { now: NOV_10 })).toBe("/black");
    expect(blackOnlyRedirect({ pathname: "/comecar" }, { now: NOV_10 })).toBe("/black");
  });

  it("não mexe fora da janela, em quem está logado nem nas outras páginas", () => {
    expect(blackOnlyRedirect({ pathname: "/" }, { now: OCT_31_2359_BRT })).toBeNull();
    expect(blackOnlyRedirect({ pathname: "/" }, { now: DEC_01_0000_BRT })).toBeNull();
    expect(blackOnlyRedirect({ pathname: "/" }, { now: NOV_10, loggedIn: true })).toBeNull();
    for (const pathname of ["/black", "/auth", "/dashboard", "/obrigado", "/privacidade", "/indicar"]) {
      expect(blackOnlyRedirect({ pathname }, { now: NOV_10 })).toBeNull();
    }
  });

  it("o script do index.html usa os mesmos caminhos e as mesmas datas", () => {
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    const list = html.match(/var blackOnlyPaths = (\[[^\]]*\]);/);
    expect(list).not.toBeNull();
    expect(JSON.parse(list![1])).toEqual([...BLACK_ONLY_PATHS]);
    expect(html).toContain(`Date.parse("${BLACK_OFFER.startsAt}")`);
    expect(html).toContain(`Date.parse("${BLACK_OFFER.endsAt}")`);
  });
});

describe("API de Conversões da Meta", () => {
  it("sem aceite de marketing não grava nada no checkout", () => {
    expect(trackingMetadata(undefined)).toEqual({});
    expect(trackingMetadata({ consent: false, fbp: "fb.1.1730000000000.123" })).toEqual({});
    expect(trackingMetadata({ consent: "true" })).toEqual({});
  });

  it("com aceite grava a marca e só cookies no formato da Meta", () => {
    const meta = trackingMetadata(
      { consent: true, fbp: "fb.1.1730000000000.1234567890", fbc: "javascript:alert(1)" },
      { ip: "200.1.2.3, 10.0.0.1", userAgent: "Mozilla/5.0" },
    );
    expect(meta).toEqual({
      mkt_consent: "1",
      fbp: "fb.1.1730000000000.1234567890",
      client_ip: "200.1.2.3",
      client_ua: "Mozilla/5.0",
    });
  });

  it("só envia com a marca de aceite e uma sessão", () => {
    expect(shouldSendPurchase({ sessionId: "cs_1", metadata: { mkt_consent: "1" } })).toBe(true);
    expect(shouldSendPurchase({ sessionId: "cs_1", metadata: {} })).toBe(false);
    expect(shouldSendPurchase({ sessionId: "", metadata: { mkt_consent: "1" } })).toBe(false);
  });

  it("monta a compra com e-mail em SHA-256 e event_id igual ao do Pixel", async () => {
    const payload = await buildPurchasePayload({
      sessionId: "cs_test_123",
      email: "  Medico@Exemplo.com ",
      amountCents: 39990,
      currency: "brl",
      metadata: { mkt_consent: "1", plan: "black_anual_2026", fbp: "fb.1.1730000000000.1" },
      eventTime: 1793500000,
    });
    const event = payload.data[0];
    expect(event.event_name).toBe("Purchase");
    expect(event.event_id).toBe("cs_test_123");
    expect(event.user_data.em).toEqual([await sha256Hex("medico@exemplo.com")]);
    expect(JSON.stringify(payload)).not.toContain("Medico@Exemplo.com");
    expect(event.custom_data).toMatchObject({ currency: "BRL", value: 399.9, content_name: "black_anual_2026" });
  });

  it("nunca lança e não chama a Meta sem token ou sem aceite", async () => {
    const fetchFn = vi.fn();
    expect(await sendPurchaseToMeta({ sessionId: "cs", metadata: { mkt_consent: "1" } }, { token: "" }, fetchFn))
      .toMatchObject({ sent: false, reason: "no_token" });
    expect(await sendPurchaseToMeta({ sessionId: "cs", metadata: {} }, { token: "t" }, fetchFn))
      .toMatchObject({ sent: false, reason: "no_consent" });
    expect(fetchFn).not.toHaveBeenCalled();
    const failing = vi.fn().mockRejectedValue(new Error("rede fora"));
    expect(await sendPurchaseToMeta({ sessionId: "cs", metadata: { mkt_consent: "1" } }, { token: "t" }, failing))
      .toMatchObject({ sent: false, reason: "rede fora" });
  });
});

import { checkoutSubmitMessage, resolveOneTimePlan } from "../../../supabase/functions/_shared/one-time-purchase";

describe("texto da página de pagamento do Stripe", () => {
  it("mostra a garantia incondicional e cabe no limite do Stripe (1.200)", () => {
    const black = checkoutSubmitMessage(resolveOneTimePlan("black_anual_2026", NOV_10));
    expect(black).toContain("Black MedStation");
    expect(black).toContain("sem renovação automática");
    expect(checkoutSubmitMessage(null)).toContain("Cancele quando quiser");
    for (const text of [black, checkoutSubmitMessage(null)]) {
      expect(text).toContain("Garantia incondicional de 7 dias");
      expect(text.length).toBeLessThanOrEqual(1200);
    }
  });
});
