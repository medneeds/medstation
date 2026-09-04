import { describe, it, expect } from "vitest";
import {
  INTERPRETER_MODALITIES,
  INTERPRETER_MODALITY_LABEL,
  applyModalityDetection,
  conversationInterpreterModality,
  detectInterpreterModality,
  interpreterCopy,
} from "../interpreterModality";
import { ECG_MODE } from "../ecgInterpreter";
import { RADIOLOGY_MODE } from "../radiologyInterpreter";

describe("detectInterpreterModality (auxiliar e conservadora)", () => {
  it("reconhece ECG pelo nome do arquivo", () => {
    expect(detectInterpreterModality([{ name: "ecg_paciente.jpg" }])).toEqual({ modality: "ecg", confident: true });
    expect(detectInterpreterModality([{ name: "eletrocardiograma-12.png" }]).modality).toBe("ecg");
  });

  it("reconhece radiografia pelo nome do arquivo", () => {
    expect(detectInterpreterModality([{ name: "rx torax.jpg" }])).toEqual({ modality: "radiografia", confident: true });
    expect(detectInterpreterModality([{ name: "chest-xray.png" }]).modality).toBe("radiografia");
  });

  it("usa o texto digitado como pista", () => {
    expect(detectInterpreterModality([{ name: "img001.jpg" }], "avalie este ECG").modality).toBe("ecg");
  });

  it("não adivinha sem pista textual", () => {
    expect(detectInterpreterModality([{ name: "img001.jpg" }], "")).toEqual({ modality: null, confident: false });
    expect(detectInterpreterModality([], "paciente com dor").confident).toBe(false);
  });

  it("não adivinha com pistas conflitantes", () => {
    expect(detectInterpreterModality([{ name: "ecg.jpg" }, { name: "rx torax.jpg" }]).confident).toBe(false);
    expect(detectInterpreterModality([{ name: "img.jpg" }], "comparar ECG e radiografia").confident).toBe(false);
  });

  it("nunca considera proporção/dimensão da imagem", () => {
    expect(detectInterpreterModality([{ name: "3000x800.jpg" }]).confident).toBe(false);
  });
});

describe("applyModalityDetection", () => {
  it("respeita a escolha manual do médico", () => {
    const r = applyModalityDetection({
      current: "radiografia",
      locked: true,
      detection: { modality: "ecg", confident: true },
    });
    expect(r).toEqual({ modality: "radiografia", changed: false });
  });

  it("não muda sem confiança", () => {
    const r = applyModalityDetection({
      current: "radiografia",
      locked: false,
      detection: { modality: null, confident: false },
    });
    expect(r.changed).toBe(false);
  });

  it("ajusta quando há confiança e nenhuma escolha manual", () => {
    const r = applyModalityDetection({
      current: "radiografia",
      locked: false,
      detection: { modality: "ecg", confident: true },
    });
    expect(r).toEqual({ modality: "ecg", changed: true });
  });
});

describe("conversationInterpreterModality", () => {
  it("recupera a modalidade persistida nos metadados", () => {
    expect(conversationInterpreterModality([{ role: "user", metadata: { mode: ECG_MODE } }])).toBe("ecg");
    expect(conversationInterpreterModality([{ role: "user", metadata: { mode: RADIOLOGY_MODE } }])).toBe("radiografia");
  });

  it("retorna null sem metadados de interpretador", () => {
    expect(conversationInterpreterModality([{ role: "user", metadata: { foo: 1 } }, { role: "assistant" }])).toBeNull();
    expect(conversationInterpreterModality([])).toBeNull();
  });
});

describe("interpreterCopy", () => {
  it("cobre as duas modalidades com textos distintos", () => {
    expect(INTERPRETER_MODALITIES).toEqual(["radiografia", "ecg"]);
    const rx = interpreterCopy("radiografia");
    const ecg = interpreterCopy("ecg");
    expect(rx.label).toBe(INTERPRETER_MODALITY_LABEL.radiografia);
    expect(ecg.label).toBe(INTERPRETER_MODALITY_LABEL.ecg);
    expect(ecg.sendTitle).not.toBe(rx.sendTitle);
    expect(ecg.followUpNoticeMany(2)).toContain("ECG");
    expect(rx.followUpNoticeMany(2)).toContain("radiografias");
  });
});
