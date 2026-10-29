import { describe, it, expect } from "vitest";
import { buildPrescriptionHtml } from "../prescriptionPrint";

const doctor = { fullName: "Ana Lima", gender: "F", crm: "1234", crmState: "MA", rqe: "567" };
const rx = {
  number: "RX-1",
  createdAt: "2026-10-29T12:00:00Z",
  patientName: "João <script>",
  medications: [{ name: "Clonazepam 2 mg", dosage: "1 cp", frequency: "à noite", duration: "30 dias" }],
};

const count = (s: string, sub: string) => s.split(sub).length - 1;

describe("impressão de receita", () => {
  it("receita simples sai em uma via", () => {
    const html = buildPrescriptionHtml("simples", doctor, rx);
    expect(count(html, '<section class="via">')).toBe(1);
    expect(html).not.toContain("CONTROLE ESPECIAL");
  });

  it("controle especial sai em duas vias com identificação do comprador", () => {
    const html = buildPrescriptionHtml("controle_especial", doctor, rx);
    expect(count(html, '<section class="via">')).toBe(2);
    expect(html).toContain("1ª via · Retenção da farmácia");
    expect(html).toContain("2ª via · Orientação ao paciente");
    expect(count(html, "IDENTIFICAÇÃO DO COMPRADOR")).toBe(2);
  });

  it("cabeçalho traz CRM/UF e RQE e escapa o texto do paciente", () => {
    const html = buildPrescriptionHtml("simples", doctor, rx);
    expect(html).toContain("CRM 1234/MA · RQE 567");
    expect(html).not.toContain("João <script>");
  });
});
