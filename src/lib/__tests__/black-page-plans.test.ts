import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLACK_PAGE_PLANS } from "@/lib/blackPagePlans";
import { BLACK_OFFER, PRICE_TABLE } from "@/lib/pricingSchedule";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("planos da página /black", () => {
  it("Black anual continua sendo a oferta principal de R$ 399,90", () => {
    expect(BLACK_PAGE_PLANS.black.plan).toBe(BLACK_OFFER.slug);
    expect(BLACK_PAGE_PLANS.black.priceBrl).toBe(399.9);
    expect(BLACK_PAGE_PLANS.black.leadSource).toBe("black_checkout");
  });

  it("mensal recorrente de R$ 49,90 usa o plano mensal do cartão", () => {
    expect(BLACK_PAGE_PLANS.monthly).toMatchObject({ plan: "pro_completo", billingPeriod: "monthly" });
    expect(BLACK_PAGE_PLANS.monthly.priceBrl).toBe(PRICE_TABLE.launch.monthlyCents / 100);
    expect(BLACK_PAGE_PLANS.monthly.priceBrl).toBe(49.9);
  });

  it("anual com Arsenal Med é o anual à vista de R$ 499,90", () => {
    expect(BLACK_PAGE_PLANS.annual_arsenal).toMatchObject({ plan: "pro_completo_yearly", billingPeriod: "yearly" });
    expect(BLACK_PAGE_PLANS.annual_arsenal.priceBrl).toBe(49990 / 100);
  });

  it("planos alternativos não entram nos e-mails de recuperação da Black", () => {
    expect(BLACK_PAGE_PLANS.monthly.leadSource).not.toBe("black_checkout");
    expect(BLACK_PAGE_PLANS.annual_arsenal.leadSource).not.toBe("black_checkout");
  });

  it("checkouts marcam a origem e devolvem para /black quem desiste", () => {
    for (const fn of ["guest-checkout", "create-checkout"]) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(src).toContain('body.entry === "black_page"');
      expect(src).toContain('entry: "black_page"');
      expect(src).toMatch(/fromBlackPage \? `\$\{origin\}\/black\?canceled=true`/);
    }
  });

  it("a página manda a origem nos dois tipos de checkout e não promete parcelamento", () => {
    const page = read("src/pages/Black.tsx");
    expect(page.match(/entry: "black_page"/g)?.length).toBe(2);
    expect(page).toContain("Assinar o mensal");
    expect(page).toContain("Anual com o Arsenal Med");
    const block = page.slice(page.indexOf("function OtherPlans"), page.indexOf("function GoldCta"));
    expect(block.length).toBeGreaterThan(200);
    expect(block).not.toMatch(/12x|parcel|boleto|Pix/i);
  });
});

describe("pop-up de e-mail da /black", () => {
  const page = read("src/pages/Black.tsx");

  it("o card não tem mais campos abertos de e-mail nem de WhatsApp", () => {
    const card = page.slice(page.indexOf("function CheckoutCard"), page.indexOf("<Dialog open="));
    expect(card).not.toContain('id="black-email"');
    expect(card).not.toContain("black-phone");
    expect(page).not.toMatch(/WhatsApp \(opcional\)|setPhone/);
  });

  it("todos os botões de compra abrem o pop-up; quem está logado vai direto ao pagamento", () => {
    expect(page).not.toContain("scrollToCheckout");
    expect(page).toContain("OPEN_CHECKOUT_EVENT");
    expect(page).toMatch(/if \(sessionEmail\) \{\s*void startCheckout\(choice\);/);
    expect(page).toContain('id="black-email"');
  });
});
