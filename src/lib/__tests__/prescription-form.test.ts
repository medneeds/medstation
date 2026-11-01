import { describe, it, expect } from "vitest";
import {
  matchDictatedPatient,
  mergeDictatedMedications,
  normalizePersonName,
  parseValidityDays,
} from "../prescriptionForm";

const p = (id: string, name: string) => ({ id, name });
const med = (name: string, dosage = "") => ({ name, dosage, frequency: "", duration: "", instructions: "" });
const empty = med("");

describe("paciente pelo nome ditado", () => {
  const patients = [p("1", "Mariana Souza"), p("2", "José da Silva"), p("3", "Ana Lima"), p("4", "Ana Lima")];

  it("seleciona quando o nome completo é idêntico", () => {
    expect(matchDictatedPatient(patients, "Mariana Souza")).toEqual({ status: "match", patient: patients[0] });
  });

  it("ignora acentos, maiúsculas e espaços extras", () => {
    expect(matchDictatedPatient(patients, "  JOSE   da silva ")).toEqual({ status: "match", patient: patients[1] });
    expect(normalizePersonName("Conceição")).toBe("conceicao");
  });

  it("homônimos não selecionam ninguém", () => {
    expect(matchDictatedPatient(patients, "ana lima")).toEqual({ status: "ambiguous", count: 2 });
  });

  it("nome parcial nunca seleciona (Ana x Mariana)", () => {
    expect(matchDictatedPatient(patients, "Ana")).toEqual({ status: "none" });
    expect(matchDictatedPatient(patients, "Mariana")).toEqual({ status: "none" });
    expect(matchDictatedPatient(patients, "Mariana Souza Costa")).toEqual({ status: "none" });
  });

  it("nome vazio não seleciona", () => {
    expect(matchDictatedPatient(patients, "   ")).toEqual({ status: "none" });
  });
});

describe("medicamentos ditados", () => {
  it("lista vazia ou só placeholder: o ditado substitui", () => {
    expect(mergeDictatedMedications([empty], [med("Dipirona")])).toEqual([med("Dipirona")]);
    expect(mergeDictatedMedications([], [med("Dipirona")])).toEqual([med("Dipirona")]);
  });

  it("mantém o que já foi digitado e acrescenta o ditado, sem linhas vazias", () => {
    const current = [med("Amoxicilina"), empty, med("", "500mg")];
    expect(mergeDictatedMedications(current, [med("Dipirona")])).toEqual([
      med("Amoxicilina"),
      med("", "500mg"),
      med("Dipirona"),
    ]);
  });

  it("ditado sem medicamentos não mexe na lista", () => {
    const current = [med("Amoxicilina")];
    expect(mergeDictatedMedications(current, [])).toBe(current);
  });
});

describe("validade em dias", () => {
  it("vazio ou inválido vira 30", () => {
    expect(parseValidityDays("")).toBe(30);
    expect(parseValidityDays("abc")).toBe(30);
    expect(parseValidityDays(undefined)).toBe(30);
  });

  it("limita entre 1 e 365", () => {
    expect(parseValidityDays("0")).toBe(1);
    expect(parseValidityDays("-5")).toBe(1);
    expect(parseValidityDays("9999")).toBe(365);
    expect(parseValidityDays("60")).toBe(60);
    expect(parseValidityDays(90)).toBe(90);
  });
});
