import { describe, expect, it } from "vitest";
import {
  allowedSignatureMethods,
  classifyMedication,
  classifyPrescription,
  copiesFor,
  doctorIssues,
  effectiveValidityDays,
  patientIssues,
  printableCid,
  showSpecialty,
} from "@/lib/officialDocument";
import { buildExamRequestPdf, buildPrescriptionPdf } from "@/lib/officialPdf";

const doctor = { fullName: "Ana Souza", crm: "12345", crmState: "SP", address: "Rua A, 10", city: "São Paulo", state: "SP" };

describe("official prescription rules", () => {
  it("blocks notification A and B medications (talão oficial)", () => {
    expect(classifyMedication("Clonazepam 2 mg").category).toBe("talonario");
    expect(classifyMedication("Clonazepam 2 mg").talonario).toBe("B");
    expect(classifyMedication("Metilfenidato 10 mg").talonario).toBe("A");
    expect(classifyMedication("Isotretinoína 20 mg").talonario).toBe("especial");
    expect(classifyMedication("Rivotril 2 mg").talonario).toBe("B");
    expect(classifyMedication("Ritalina LA 20 mg").talonario).toBe("A");
  });

  it("detects controle especial and antimicrobiano", () => {
    expect(classifyMedication("Sertralina 50 mg").category).toBe("controle_especial");
    expect(classifyMedication("Paracetamol + codeína").category).toBe("controle_especial");
    expect(classifyMedication("Amoxicilina 500 mg").category).toBe("antimicrobiano");
    expect(classifyMedication("Dipirona 1 g").category).toBe("simples");
    expect(classifyMedication("Ciproeptadina 4 mg").category).toBe("simples");
  });

  it("strictest medication decides the document", () => {
    expect(classifyPrescription(["Dipirona", "Amoxicilina"]).category).toBe("antimicrobiano");
    expect(classifyPrescription(["Amoxicilina", "Sertralina"]).category).toBe("controle_especial");
  });

  it("antimicrobiano and controle especial print 2 copies, simples 1", () => {
    expect(copiesFor("simples")).toHaveLength(1);
    expect(copiesFor("antimicrobiano")).toHaveLength(2);
    expect(copiesFor("controle_especial")).toHaveLength(2);
  });

  it("legal validity: 10 days antimicrobiano, 30 days controle especial, doctor's choice otherwise", () => {
    expect(effectiveValidityDays("antimicrobiano", 60)).toBe(10);
    expect(effectiveValidityDays("controle_especial", 60)).toBe(30);
    expect(effectiveValidityDays("simples", 60)).toBe(60);
  });

  it("an antibiotic inside a controle especial receita limits validity to 10 days and requires age and sex", () => {
    expect(effectiveValidityDays("controle_especial", 60, ["Sertralina", "Amoxicilina"])).toBe(10);
    const f = patientIssues({ name: "João", address: "Rua B", city: "X", state: "SP" }, "prescription", "controle_especial", true).filter((i) => i.blocking).map((i) => i.field);
    expect(f).toEqual(expect.arrayContaining(["dateOfBirth", "sex"]));
  });

  it("gov.br signature only for simples and exams", () => {
    expect(allowedSignatureMethods("prescription", "simples")).toContain("govbr");
    expect(allowedSignatureMethods("exam")).toContain("govbr");
    expect(allowedSignatureMethods("prescription", "controle_especial")).not.toContain("govbr");
    expect(allowedSignatureMethods("prescription", "antimicrobiano")).not.toContain("govbr");
  });

  it("requires CRM, UF and office address from the doctor", () => {
    expect(doctorIssues(doctor).filter((i) => i.blocking)).toHaveLength(0);
    const fields = doctorIssues({ fullName: "Ana" }).filter((i) => i.blocking).map((i) => i.field);
    expect(fields).toEqual(expect.arrayContaining(["crm", "crmState", "address"]));
  });

  it("specialty appears only with RQE", () => {
    expect(showSpecialty({ specialty: "Cardiologia" })).toBe(false);
    expect(showSpecialty({ specialty: "Cardiologia", rqe: "999" })).toBe(true);
  });

  it("antimicrobiano requires age and sex; controle especial requires address", () => {
    const anti = patientIssues({ name: "João" }, "prescription", "antimicrobiano").filter((i) => i.blocking).map((i) => i.field);
    expect(anti).toEqual(expect.arrayContaining(["dateOfBirth", "sex"]));
    const ce = patientIssues({ name: "João" }, "prescription", "controle_especial").filter((i) => i.blocking).map((i) => i.field);
    expect(ce).toEqual(expect.arrayContaining(["address", "city"]));
    expect(patientIssues({ name: "João" }, "prescription", "simples").some((i) => i.blocking)).toBe(false);
  });

  it("CID goes on the exam request only with patient consent", () => {
    expect(printableCid("J18.9", false)).toBeNull();
    expect(printableCid("J18.9", true)).toBe("J18.9");
  });
});

describe("official PDF builder", () => {
  const base = { id: "3f2a9c1e-0000-4000-8000-000000000000", number: "RX-1", issuedAt: new Date("2026-10-29T15:00:00Z"), doctor, patient: { name: "João", address: "Rua B, 2", city: "Campinas", state: "SP" }, signature: "manual" as const };

  it("controle especial PDF has one page per via", () => {
    const pdf = buildPrescriptionPdf({ ...base, category: "controle_especial", medications: [{ name: "Sertralina 50 mg", dosage: "1 comprimido", frequency: "1x ao dia", duration: "60 dias" }] });
    expect(pdf.getNumberOfPages()).toBe(2);
  });

  it("simples PDF and exam request have one page", () => {
    expect(buildPrescriptionPdf({ ...base, category: "simples", medications: [{ name: "Dipirona 1 g", dosage: "1 comprimido", frequency: "6/6 h" }] }).getNumberOfPages()).toBe(1);
    expect(buildExamRequestPdf({ ...base, exams: [{ name: "Hemograma" }] }).getNumberOfPages()).toBe(1);
  });
});
