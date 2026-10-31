import { describe, expect, it } from "vitest";
import { adminPasswordProblem } from "../../../supabase/functions/_shared/admin-password";

describe("senha definida pelo admin", () => {
  it("recusa senha com menos de 8 caracteres", () => {
    expect(adminPasswordProblem("abc1234")).not.toBeNull();
  });

  it("exige letras e números", () => {
    expect(adminPasswordProblem("somenteletras")).not.toBeNull();
    expect(adminPasswordProblem("12345678")).not.toBeNull();
  });

  it("recusa senha que contém o e-mail do usuário", () => {
    expect(adminPasswordProblem("daiane2026", "daiane@gmail.com")).not.toBeNull();
  });

  it("aceita senha com 8+ caracteres, letras e números", () => {
    expect(adminPasswordProblem("Plantao2026", "daiane@gmail.com")).toBeNull();
  });
});
