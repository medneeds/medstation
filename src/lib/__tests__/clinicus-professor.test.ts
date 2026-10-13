import { describe, expect, it } from "vitest";
import { clinicusModeMetadata, resolveClinicusTeachingModes, restoreClinicusTeachingMode } from "../clinicusProfessor";
import { isProfessorStyle, PROFESSOR_STYLES, PROFESSOR_ONE_LINE_MAX_WORDS, PROFESSOR_STORY_WORDS, professorSafetyContext, validateProfessorRequest } from "../../../supabase/functions/agent-chat/professor";

describe("Clínicus Professor: regras de seleção", () => {
  it("identifica dados graves para suspender humor sem afirmar diagnóstico", () => {
    expect(professorSafetyContext("Paciente com hipotensão 70/40 e dispneia intensa").severe).toBe(true);
    expect(professorSafetyContext("Explique SIADH").severe).toBe(false);
  });
  it("reconhece caso real para não inventar uma narrativa adicional", () => {
    expect(professorSafetyContext("Caso real informado: homem com dispneia e edema").realCase).toBe(true);
    expect(professorSafetyContext("Explique síndrome nefrótica").realCase).toBe(false);
  });
  it("aceita exatamente os cinco estilos aprovados", () => {
    expect(PROFESSOR_STYLES.map((style) => style.value)).toEqual(["formal", "descontraido", "metaforico", "uma_linha", "historias"]);
    for (const value of ["formal", "descontraido", "metaforico", "uma_linha", "historias"]) expect(isProfessorStyle(value)).toBe(true);
    for (const value of ["auto", null, {}, "toString"]) expect(isProfessorStyle(value)).toBe(false);
  });
  it("Professor desliga anamnese e relatório", () => {
    expect(resolveClinicusTeachingModes({ directAHEMode: true, reportMode: true, professorMode: false }, { professor: true }))
      .toEqual({ directAHEMode: false, reportMode: false, professorMode: true });
  });
  it.each(["anamnese", "relatorio"] as const)("%s desliga Professor", (mode) => {
    const next = resolveClinicusTeachingModes({ directAHEMode: false, reportMode: false, professorMode: true }, { [mode]: true });
    expect(next.professorMode).toBe(false);
    expect(mode === "anamnese" ? next.directAHEMode : next.reportMode).toBe(true);
  });
  it("desligar Professor não liga documentação", () => {
    expect(resolveClinicusTeachingModes({ directAHEMode: false, reportMode: false, professorMode: true }, { professor: false }))
      .toEqual({ directAHEMode: false, reportMode: false, professorMode: false });
  });
  it("servidor rejeita Professor fora do Clínicus", () => {
    expect(validateProfessorRequest({ agentType: "examinus", professorMode: true })).not.toBeNull();
    expect(validateProfessorRequest({ agentType: "clinicus", professorMode: true, professorStyle: "formal" })).toBeNull();
  });
  it.each(["directAHEMode", "reportMode", "caseSuggestMode"] as const)("servidor rejeita conflito com %s", (field) => {
    expect(validateProfessorRequest({ agentType: "clinicus", professorMode: true, [field]: true })).not.toBeNull();
  });
  it("servidor rejeita estilo desconhecido e modo não booleano", () => {
    expect(validateProfessorRequest({ professorStyle: "inventado" })).not.toBeNull();
    expect(validateProfessorRequest({ professorMode: "true" })).not.toBeNull();
    expect(validateProfessorRequest({ agentType: "clinicus" })).toBeNull();
  });
  it("mantém os limites aprovados de extensão", () => {
    expect(PROFESSOR_ONE_LINE_MAX_WORDS).toBe(45);
    expect(PROFESSOR_STORY_WORDS).toEqual({ min: 180, max: 300 });
  });
  it("restaura o estilo da última pergunta educativa", () => {
    const metadata = clinicusModeMetadata({ directAHEMode: false, reportMode: false, professorMode: true }, "historias");
    expect(restoreClinicusTeachingMode([{ role: "user", metadata }, { role: "assistant" }]))
      .toEqual({ directAHEMode: false, reportMode: false, professorMode: true, professorStyle: "historias" });
  });
  it("não deixa Professor vazar para outra conversa ou pergunta documental", () => {
    expect(restoreClinicusTeachingMode([]).professorMode).toBe(false);
    expect(restoreClinicusTeachingMode([{ role: "user", metadata: { clinicus_mode: "professor", professor_style: "historias" } },
      { role: "user", metadata: { clinicus_mode: "anamnese" } }]))
      .toEqual({ directAHEMode: true, reportMode: false, professorMode: false, professorStyle: "formal" });
  });
  it("histórico antigo e estilo corrompido retornam ao padrão seguro", () => {
    expect(restoreClinicusTeachingMode([{ role: "user" }]).professorMode).toBe(false);
    expect(restoreClinicusTeachingMode([{ role: "user", metadata: { clinicus_mode: "professor", professor_style: "invalido" } }]).professorStyle).toBe("formal");
  });
});