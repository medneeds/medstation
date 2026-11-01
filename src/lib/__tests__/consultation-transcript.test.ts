import { describe, expect, it } from "vitest";
import { buildTranscriptText } from "@/lib/consultationTranscript";

describe("transcrição do Modo Escuta", () => {
  const segments = [
    { text: " Bom dia, o que trouxe o senhor? ", speaker: "doctor" },
    { text: "Dor no peito desde ontem.", speaker: "patient" },
    { text: "   ", speaker: "patient" },
    { text: "Ele não dormiu bem.", speaker: "companion" },
  ];

  it("identifica quem falou quando os falantes são separados", () => {
    expect(buildTranscriptText(segments, false)).toBe(
      "Médico: Bom dia, o que trouxe o senhor?\n\nPaciente: Dor no peito desde ontem.\n\nAcompanhante: Ele não dormiu bem.",
    );
  });

  it("no modo unificado mostra só o texto, sem trechos vazios", () => {
    expect(buildTranscriptText(segments, true)).toBe(
      "Bom dia, o que trouxe o senhor?\n\nDor no peito desde ontem.\n\nEle não dormiu bem.",
    );
  });

  it("sem trechos devolve vazio", () => {
    expect(buildTranscriptText([], false)).toBe("");
  });
});
