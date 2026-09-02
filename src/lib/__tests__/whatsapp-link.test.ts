import { describe, it, expect } from "vitest";
import { whatsappUrl } from "@/pages/admin/AdminUsers";

describe("whatsappUrl", () => {
  it("retorna null sem telefone", () => {
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl(undefined)).toBeNull();
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl("() -")).toBeNull();
  });

  it("adiciona DDI 55 para celular nacional (11 dígitos)", () => {
    expect(whatsappUrl("(85) 99999-1234")).toBe("https://wa.me/5585999991234");
  });

  it("adiciona DDI 55 para fixo nacional (10 dígitos)", () => {
    expect(whatsappUrl("85 4002-8922")).toBe("https://wa.me/558540028922");
  });

  it("preserva número já internacional", () => {
    expect(whatsappUrl("+55 (85) 99999-1234")).toBe("https://wa.me/5585999991234");
    expect(whatsappUrl("+1 202 555 0183")).toBe("https://wa.me/12025550183");
  });

  it("remove zero à esquerda e rejeita números curtos demais", () => {
    expect(whatsappUrl("085999991234")).toBe("https://wa.me/5585999991234");
    expect(whatsappUrl("9999")).toBeNull();
  });
});
