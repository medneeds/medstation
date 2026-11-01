import { describe, it, expect } from "vitest";
import {
  decideDictatedPatient,
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

describe("decisão sobre o paciente ditado", () => {
  const patients = [p("1", "Mariana Souza"), p("3", "Ana Lima"), p("4", "Ana Lima")];
  const decide = (selected: string | null, dictated: string) =>
    decideDictatedPatient(selected, matchDictatedPatient(patients, dictated), dictated);

  it("sem paciente selecionado e nome único idêntico: seleciona", () => {
    expect(decide(null, "mariana  SOUZA")).toEqual({ action: "select", patient: patients[0] });
  });

  it("sem paciente selecionado e homônimos ou sem correspondência: pede para escolher", () => {
    expect(decide(null, "Ana Lima")).toEqual({ action: "ask", reason: "ambiguous", count: 2 });
    expect(decide(null, "Ana")).toEqual({ action: "ask", reason: "none" });
  });

  it("com paciente selecionado e mesmo nome: mantém sem aviso", () => {
    expect(decide("Mariana Souza", " MARIANA souza ")).toEqual({ action: "keep" });
  });

  it("com paciente selecionado e nome diferente: nunca troca, só avisa", () => {
    expect(decide("Ana Lima", "Mariana Souza")).toEqual({ action: "warn" });
    expect(decide("Mariana Souza", "Ana")).toEqual({ action: "warn" });
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

  it("medicamento ditado com o mesmo nome substitui o preenchido no lugar, sem duplicar", () => {
    const current = [med("Amoxicilina", "500mg"), med("Dipirona", "1g")];
    expect(mergeDictatedMedications(current, [med("  AMOXICILINA ", "875mg"), med("Omeprazol")])).toEqual([
      med("  AMOXICILINA ", "875mg"),
      med("Dipirona", "1g"),
      med("Omeprazol"),
    ]);
  });

  it("não altera a lista original", () => {
    const current = [med("Amoxicilina", "500mg")];
    mergeDictatedMedications(current, [med("Amoxicilina", "875mg")]);
    expect(current).toEqual([med("Amoxicilina", "500mg")]);
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
