import { describe, expect, it } from "vitest";
import {
  clinicalSectionTitles,
  isStructuredClinicalText,
  parseClinicalResponse,
  stripMarkdown,
} from "@/lib/clinicalResponse";

const AHE = `IDENTIFICAÇÃO
Paciente masculino, 62 anos, hipertenso.

QUEIXA PRINCIPAL
Dor torácica há 2 horas.

HISTÓRIA DA DOENÇA ATUAL
Iniciou dor retroesternal em aperto, com irradiação para o membro superior esquerdo.
Refere sudorese e náusea associadas.

EXAME FÍSICO
- PA: 150x90 mmHg
- FC: 98 bpm
- Ausculta cardíaca sem sopros

CONDUTA
Monitorização, ECG seriado e troponina.`;

describe("stripMarkdown", () => {
  it("remove asteriscos e títulos markdown", () => {
    expect(stripMarkdown("## CONDUTA\n**AAS** 300mg")).toBe("CONDUTA\nAAS 300mg");
  });
});

describe("isStructuredClinicalText", () => {
  it("reconhece um AHE estruturado", () => {
    expect(isStructuredClinicalText(AHE)).toBe(true);
  });

  it("ignora respostas curtas de conversa", () => {
    expect(isStructuredClinicalText("Claro, doutor. Pode me contar mais sobre o quadro?")).toBe(false);
  });

  it("ignora texto longo sem hierarquia", () => {
    expect(isStructuredClinicalText("palavra ".repeat(80))).toBe(false);
  });
});

describe("parseClinicalResponse", () => {
  it("separa seções por títulos em caixa alta", () => {
    const sections = parseClinicalResponse(AHE);
    expect(clinicalSectionTitles(sections)).toEqual([
      "IDENTIFICAÇÃO",
      "QUEIXA PRINCIPAL",
      "HISTÓRIA DA DOENÇA ATUAL",
      "EXAME FÍSICO",
      "CONDUTA",
    ]);
  });

  it("converte marcadores em lista", () => {
    const exame = parseClinicalResponse(AHE).find((s) => s.title === "EXAME FÍSICO")!;
    const bullets = exame.blocks.find((b) => b.type === "bullets");
    expect(bullets).toMatchObject({
      type: "bullets",
      items: ["PA: 150x90 mmHg", "FC: 98 bpm", "Ausculta cardíaca sem sopros"],
    });
  });

  it("mantém o texto da seção para copiar isoladamente", () => {
    const conduta = parseClinicalResponse(AHE).find((s) => s.title === "CONDUTA")!;
    expect(conduta.raw).toBe("CONDUTA\nMonitorização, ECG seriado e troponina.");
  });

  it("identifica linhas rótulo: valor", () => {
    const sections = parseClinicalResponse("RESUMO\nCID: I21.0");
    expect(sections[0].blocks[0]).toMatchObject({ type: "keyValue", label: "CID", value: "I21.0" });
  });

  it("trata texto sem estrutura como um único bloco", () => {
    const sections = parseClinicalResponse("Paciente estável, seguimento ambulatorial.");
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe("");
    expect(sections[0].blocks[0]).toMatchObject({ type: "paragraph" });
  });

  it("funciona com conteúdo parcial de streaming", () => {
    const partial = "IDENTIFICAÇÃO\nPaciente masculino, 62 anos.\n\nQUEIXA PRIN";
    const sections = parseClinicalResponse(partial);
    expect(sections[0].title).toBe("IDENTIFICAÇÃO");
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });

  it("não quebra com texto vazio", () => {
    expect(parseClinicalResponse("")).toEqual([]);
  });
});
