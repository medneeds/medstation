import { describe, expect, it } from "vitest";
import { describeCheckoutError, messageForCheckoutError, parseCheckoutError } from "../checkoutErrors";

function httpError(status: number, body: unknown) {
  const error = new Error("Edge Function returned a non-2xx status code") as Error & { context: Response };
  error.context = new Response(JSON.stringify(body), { status });
  return error;
}

describe("parseCheckoutError", () => {
  it("extrai code e mensagem do corpo 409", async () => {
    const info = await parseCheckoutError(
      httpError(409, { error: "O pagamento via Pix ainda não está disponível nesta conta.", code: "PIX_UNAVAILABLE" }),
    );
    expect(info.code).toBe("PIX_UNAVAILABLE");
    expect(info.message).toContain("Pix");
  });

  it("cai para a mensagem genérica sem context", async () => {
    const info = await parseCheckoutError(new Error("boom"));
    expect(info.code).toBeNull();
    expect(info.message).toBe("boom");
  });

  it("não quebra com corpo inválido", async () => {
    const error = new Error("falhou") as Error & { context: Response };
    error.context = new Response("<html>502</html>", { status: 502 });
    const info = await parseCheckoutError(error);
    expect(info.code).toBeNull();
    expect(info.message).toBe("falhou");
  });
});

describe("messageForCheckoutError", () => {
  it("mostra indisponibilidade explícita do Pix", () => {
    expect(messageForCheckoutError({ code: "PIX_UNAVAILABLE", message: "x" })).toContain("Pix ainda não está disponível");
  });

  it("mantém mensagem do servidor para códigos desconhecidos", () => {
    expect(messageForCheckoutError({ code: "WHATEVER", message: "erro específico" })).toBe("erro específico");
  });

  it("usa fallback quando não há mensagem", () => {
    expect(messageForCheckoutError({ code: null, message: "" })).toBe("Não foi possível iniciar o checkout.");
  });
});

describe("describeCheckoutError", () => {
  it("combina parsing e tradução", async () => {
    const msg = await describeCheckoutError(httpError(409, { error: "ativa", code: "EXISTING_SUBSCRIPTION" }));
    expect(msg).toBe("Sua conta já possui uma assinatura ativa.");
  });
});
