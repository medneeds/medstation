import { describe, expect, it } from "vitest";
import {
  batchParts,
  directSendMime,
  encodeWavPcm16,
  findSplitPoints,
  transcriptToSegments,
  validateImportFile,
} from "@/lib/audioImport";

describe("áudio gravado no Modo Escuta", () => {
  it("corta perto do alvo, no trecho silencioso, sem cortar palavras", () => {
    const rate = 100; // amostras por segundo (baixo só para o teste)
    const samples = new Float32Array(330 * rate).fill(0.5);
    // silêncio entre 170 s e 172 s
    samples.fill(0, 170 * rate, 172 * rate);
    const points = findSplitPoints(samples, rate, 180, 15);
    expect(points.length).toBe(1);
    expect(points[0] / rate).toBeGreaterThanOrEqual(170);
    expect(points[0] / rate).toBeLessThanOrEqual(172);
  });

  it("não cria parte final menor que 20 s", () => {
    const rate = 100;
    const samples = new Float32Array(195 * rate).fill(0.3);
    expect(findSplitPoints(samples, rate, 180, 15)).toEqual([]);
  });

  it("áudio de 60 min vira cerca de 20 partes de até 3 min", () => {
    const rate = 50;
    const samples = new Float32Array(3600 * rate).fill(0.2);
    const points = findSplitPoints(samples, rate, 180, 15);
    expect(points.length).toBeGreaterThanOrEqual(19);
    expect(points.length).toBeLessThanOrEqual(21);
    let prev = 0;
    for (const p of points) {
      expect((p - prev) / rate).toBeLessThanOrEqual(180);
      prev = p;
    }
  });

  it("gera WAV 16 bits mono com cabeçalho correto", () => {
    const wav = encodeWavPcm16(new Float32Array([0, 1, -1]), 16000);
    expect(wav.byteLength).toBe(44 + 6);
    const v = new DataView(wav);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getInt16(46, true)).toBe(0x7fff);
  });

  it("transforma falas rotuladas em trechos de médico, paciente e acompanhante", () => {
    const segs = transcriptToSegments("Médico: O que sente?\nPaciente: Dor no peito.\nAcompanhante: Ele toma losartana 50 mg.");
    expect(segs.map((s) => s.speaker)).toEqual(["doctor", "patient", "companion"]);
    expect(segs[2].text).toBe("Ele toma losartana 50 mg.");
    expect(segs.every((s) => s.labeled)).toBe(true);
  });

  it("texto sem rótulo vira trechos sem perder palavras", () => {
    const text = "Paciente com dor há 3 dias. Nega febre. Uso de dipirona 1 g.";
    const segs = transcriptToSegments(text);
    expect(segs.every((s) => !s.labeled)).toBe(true);
    expect(segs.map((s) => s.text).join(" ")).toBe(text);
  });

  it("agrupa partes em lotes que cabem na organização das falas", () => {
    const parts = ["a".repeat(20), "b".repeat(20), "c".repeat(20)];
    expect(batchParts(parts, 45)).toEqual([`${"a".repeat(20)}\n\n${"b".repeat(20)}`, "c".repeat(20)]);
  });

  it("aceita formatos comuns e recusa o que não é áudio ou passa de 200 MB", () => {
    expect(validateImportFile("consulta.m4a", "audio/x-m4a", 5_000_000)).toBeNull();
    expect(validateImportFile("PTT-2026.opus", "", 300_000)).toBeNull();
    expect(validateImportFile("laudo.pdf", "application/pdf", 50_000)).not.toBeNull();
    expect(validateImportFile("longo.mp3", "audio/mpeg", 201 * 1024 * 1024)).not.toBeNull();
    expect(directSendMime("a.opus", "")).toBe("audio/ogg");
    expect(directSendMime("a.aac", "audio/aac")).toBeNull();
  });
});
