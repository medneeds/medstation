import { describe, it, expect, beforeEach } from "vitest";
import {
  audioFileInfo,
  canUseFallbackAfter,
  collectTranscriptFromSSE,
} from "../../../supabase/functions/_shared/transcription";
import {
  LIVE_PAUSE_AFTER_QUOTA_MS,
  clearLiveVoicePause,
  isLiveVoicePaused,
  isPermanentLiveError,
  markLiveVoiceUnavailable,
} from "../liveVoiceStatus";

describe("cópia do ditado pela IA da plataforma", () => {
  it("só tenta o serviço reserva em falha passageira", () => {
    expect(canUseFallbackAfter(0)).toBe(true);
    expect(canUseFallbackAfter(429)).toBe(true);
    expect(canUseFallbackAfter(503)).toBe(true);
    expect(canUseFallbackAfter(402)).toBe(false);
    expect(canUseFallbackAfter(403)).toBe(false);
    expect(canUseFallbackAfter(400)).toBe(false);
  });

  it("junta o texto final do stream", () => {
    const raw =
      'data: {"type":"transcript.text.delta","delta":"Paciente com "}\n\n' +
      'data: {"type":"transcript.text.delta","delta":"dor torácica"}\n\n' +
      'data: {"type":"transcript.text.done","text":"Paciente com dor torácica.","usage":{"type":"duration","seconds":4}}\n\n';
    expect(collectTranscriptFromSSE(raw)).toEqual({ text: "Paciente com dor torácica.", seconds: 4, error: null });
  });

  it("usa os pedaços quando o evento final não chega", () => {
    const raw = 'data: {"type":"transcript.text.delta","delta":"PA 120x80"}\n\n';
    expect(collectTranscriptFromSSE(raw).text).toBe("PA 120x80");
  });

  it("gravação do iPhone vai como áudio m4a e a do Chrome como webm", () => {
    expect(audioFileInfo("audio/mp4")).toEqual({ mime: "audio/mp4", ext: "m4a" });
    expect(audioFileInfo("audio/webm;codecs=opus")).toEqual({ mime: "audio/webm", ext: "webm" });
    expect(audioFileInfo("video/webm")).toEqual({ mime: "audio/webm", ext: "webm" });
  });
});

describe("texto ao vivo sem saldo", () => {
  beforeEach(() => clearLiveVoicePause());

  it("saldo esgotado não é tratado como queda de rede", () => {
    expect(isPermanentLiveError({ message: "This request exceeds your quota of 10000" })).toBe(true);
    expect(isPermanentLiveError(new Error("WebSocket closed"))).toBe(false);
  });

  it("depois do saldo esgotado, pula o ao vivo por 15 minutos", () => {
    const now = 1_000_000;
    markLiveVoiceUnavailable(now);
    expect(isLiveVoicePaused(now + LIVE_PAUSE_AFTER_QUOTA_MS - 1)).toBe(true);
    expect(isLiveVoicePaused(now + LIVE_PAUSE_AFTER_QUOTA_MS)).toBe(false);
    expect(LIVE_PAUSE_AFTER_QUOTA_MS).toBe(15 * 60 * 1000);
  });
});
