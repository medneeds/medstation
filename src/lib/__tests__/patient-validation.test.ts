import { describe, it, expect } from "vitest";
import { patientSchema } from "@/lib/validations";

describe("cadastro de paciente", () => {
  it("só com o nome salva os opcionais como vazio (sem data em branco)", () => {
    const r = patientSchema.parse({ name: "Maria", cpf: "", date_of_birth: "", phone: "", email: "", notes: "" });
    expect(r).toEqual({ name: "Maria", cpf: null, date_of_birth: null, phone: null, email: null, notes: null });
  });
  it("aceita CPF só com números e formata", () => {
    expect(patientSchema.parse({ name: "A", cpf: "12345678901" }).cpf).toBe("123.456.789-01");
  });
  it("aceita celular sem pontuação e com +55", () => {
    expect(patientSchema.parse({ name: "A", phone: "11987654321" }).phone).toBe("(11) 98765-4321");
    expect(patientSchema.parse({ name: "A", phone: "+55 31 3333-4444" }).phone).toBe("(31) 3333-4444");
  });
  it("recusa CPF incompleto e data futura", () => {
    expect(patientSchema.safeParse({ name: "A", cpf: "123" }).success).toBe(false);
    expect(patientSchema.safeParse({ name: "A", date_of_birth: "2999-01-01" }).success).toBe(false);
  });
});
