import { describe, expect, it } from "vitest";
import { isValidBirthDate, isValidPhoneBr, maskPhoneBr } from "@/pages/Onboarding";

/** Regra do gate replicada de forma pura para teste determinístico. */
function shouldRedirectToOnboarding(
  status: "loading" | "pending" | "completed" | "anonymous" | "error",
  pathname: string,
): boolean {
  return status === "pending" && pathname !== "/onboarding";
}

describe("first access gate", () => {
  it("bloqueia novos usuários com onboarding pendente", () => {
    expect(shouldRedirectToOnboarding("pending", "/dashboard")).toBe(true);
  });

  it("não cria loop dentro de /onboarding", () => {
    expect(shouldRedirectToOnboarding("pending", "/onboarding")).toBe(false);
  });

  it("não redireciona usuários antigos ou concluídos", () => {
    expect(shouldRedirectToOnboarding("completed", "/dashboard")).toBe(false);
  });

  it("erro transitório não vira bloqueio", () => {
    expect(shouldRedirectToOnboarding("error", "/dashboard")).toBe(false);
    expect(shouldRedirectToOnboarding("anonymous", "/dashboard")).toBe(false);
  });
});

describe("validação do perfil do onboarding", () => {
  it("aplica máscara BR de telefone", () => {
    expect(maskPhoneBr("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhoneBr("1132165498")).toBe("(11) 3216-5498");
    expect(isValidPhoneBr(maskPhoneBr("11987654321"))).toBe(true);
    expect(isValidPhoneBr("11987654321")).toBe(false);
  });

  it("valida data de nascimento", () => {
    expect(isValidBirthDate("1990-05-20")).toBe(true);
    expect(isValidBirthDate("20/05/1990")).toBe(false);
    expect(isValidBirthDate("2999-01-01")).toBe(false);
  });
});
