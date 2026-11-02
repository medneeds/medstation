import { describe, expect, it } from "vitest";
import * as server from "../../../supabase/functions/round-structure/topics";
import {
  appendBlock, countdownSeconds, formatClock, formatRoundTopics, joinPartTranscripts, pickRecorderMime,
  reachedRoundLimit, roundPartPath, shouldRotatePart, ROUND_COUNTDOWN_SECONDS, ROUND_MAX_SECONDS,
  ROUND_PART_SECONDS, ROUND_TOPICS,
} from "../wardRound";

const PATIENTS = [
  { ref: "P1", admissionId: "a1", bed: "1", name: "Maria", diagnosis: "Pneumonia", dayOfStay: 3 },
  { ref: "P2", admissionId: "a2", bed: "2", name: "João", diagnosis: "Sepse", dayOfStay: 5 },
];

describe("Round multiprofissional · regras", () => {
  it("app e servidor usam os mesmos tópicos e limites", () => {
    expect(ROUND_TOPICS).toEqual(server.ROUND_TOPICS);
    expect(ROUND_MAX_SECONDS).toBe(server.ROUND_MAX_SECONDS);
    expect(ROUND_PART_SECONDS).toBe(server.ROUND_PART_SECONDS);
    expect(ROUND_COUNTDOWN_SECONDS).toBe(server.ROUND_COUNTDOWN_SECONDS);
    const t = { culturas: ["Hemocultura pendente"], intervencoes: ["Suspenso furosemida"] };
    expect(formatRoundTopics(t)).toBe(server.formatRoundTopics(t));
  });

  it("gravação vai até 90 minutos, em partes de 10, com contagem nos últimos 10", () => {
    expect(ROUND_MAX_SECONDS).toBe(5400);
    expect(reachedRoundLimit(5399)).toBe(false);
    expect(reachedRoundLimit(5400)).toBe(true);
    expect(shouldRotatePart(599)).toBe(false);
    expect(shouldRotatePart(600)).toBe(true);
    expect(countdownSeconds(4799)).toBeNull();
    expect(countdownSeconds(4800)).toBe(600);
  });

  it("os oito tópicos pedidos mais outros pontos estão na lista", () => {
    expect(ROUND_TOPICS.map((t) => t.key)).toEqual([
      "intervencoes", "dispositivos", "culturas", "antibioticos", "enfermagem_fisio",
      "alta_transferencia", "familia_metas", "pendencias", "outros",
    ]);
  });

  it("aceita só pacientes da unidade; o resto vai para não identificado", () => {
    const raw = server.extractJsonObject("```json\n" + JSON.stringify({
      pacientes: [
        { ref: "P2", topicos: { antibioticos: ["Meropenem D5, previsão de 7 dias"] } },
        { ref: "P9", identificacao: "leito 12?", topicos: { pendencias: ["Ver eco"] } },
        { ref: "P1", topicos: { dispositivos: ["**CVC** D6, retirar"], inventado: ["x"] } },
        { ref: "P1", topicos: { culturas: ["Urocultura pendente"] } },
        { ref: "P2", topicos: { familia_metas: ["Não discutido"] } },
      ],
    }) + "\n```");
    const items = server.validateRoundStructure(raw, PATIENTS);
    expect(items.map((i) => i.admissionId)).toEqual(["a1", "a2", null]);
    expect(items[0].topics).toEqual({ dispositivos: ["CVC D6, retirar"], culturas: ["Urocultura pendente"] });
    expect(items[1].topics).toEqual({ antibioticos: ["Meropenem D5, previsão de 7 dias"] });
    expect(items[2].patientLabel).toBe("leito 12?");
  });

  it("texto pronto sem markdown, só títulos em caixa alta e marcadores", () => {
    const text = formatRoundTopics({ pendencias: ["Ecocardiograma amanhã"], intervencoes: ["Iniciado noradrenalina"] });
    expect(text).toBe("INTERVENÇÕES CLÍNICAS\n- Iniciado noradrenalina\n\nPENDÊNCIAS E PROGRAMAÇÕES\n- Ecocardiograma amanhã");
    expect(text).not.toMatch(/[#*]/);
  });

  it("partes, caminho e junção da transcrição", () => {
    expect(roundPartPath("u1", "s1", 0, "webm")).toBe("u1/s1/part-01.webm");
    expect(joinPartTranscripts([{ index: 1, text: "segunda" }, { index: 0, text: " primeira " }, { index: 2, text: "" }])).toBe("primeira\n\nsegunda");
    expect(pickRecorderMime((m) => m === "audio/mp4").ext).toBe("m4a");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(appendBlock("febre", "[Arquivo: hemograma.pdf]\nHb 9")).toBe("febre\n\n[Arquivo: hemograma.pdf]\nHb 9");
  });
});
