import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { estimateAudioSecondsFromBytes } from "../_shared/auth-helpers.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";
import {
  GATEWAY_STT_MODEL,
  MAX_STT_BYTES,
  audioFileInfo,
  canUseFallbackAfter,
  transcribeWithGateway,
} from "../_shared/transcription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cópia de segurança do ditado dos assistentes.
// 1º) IA da plataforma (não depende do saldo da ElevenLabs).
// 2º) ElevenLabs Scribe, só se a 1ª falhar por instabilidade passageira.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const { user } = await requirePlatformAccess(req);

    const { audio, language = "pt", context, mimeType: clientMimeType } = await req.json();
    if (!audio || typeof audio !== "string") return json({ error: "Áudio não fornecido" }, 400);

    const binaryString = atob(audio);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) audioBytes[i] = binaryString.charCodeAt(i);
    if (audioBytes.byteLength < 500) return json({ error: "Gravação curta demais" }, 400);
    if (audioBytes.byteLength > MAX_STT_BYTES) {
      return json({ error: "Gravação longa demais. Grave em partes de até 15 minutos." }, 413);
    }
    const audioSeconds = estimateAudioSecondsFromBytes(audioBytes.byteLength);
    const assistant = typeof context === "string" ? context.slice(0, 40) : "agent";

    // 1) IA da plataforma
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let gatewayFailure: { status: number; message: string } | null = null;
    if (lovableKey) {
      const sttStart = Date.now();
      const r = await transcribeWithGateway(audioBytes, clientMimeType, lovableKey);
      void logAIUsage({
        userId: user.id, assistant, functionName: "agent-transcribe",
        model: GATEWAY_STT_MODEL, audioSeconds: r.ok && r.seconds ? r.seconds : audioSeconds,
        latencyMs: Date.now() - sttStart, status: r.ok ? "ok" : "error",
        metadata: r.ok ? null : { http_status: r.status, error: r.message.slice(0, 300) },
      });
      if (r.ok) {
        return json({
          success: true, transcription: r.text, duration: r.seconds ?? audioSeconds,
          language, processingTime: Date.now() - startTime, engine: "platform",
        });
      }
      console.error("[AGENT-TRANSCRIBE] gateway error:", r.status, r.message);
      gatewayFailure = { status: r.status, message: r.message };
      if (!canUseFallbackAfter(r.status)) {
        if (r.status === 402) {
          return json({ error: "Os créditos de IA da plataforma acabaram. Seu áudio ficou guardado; avise o suporte da MedStation." }, 402);
        }
        if (r.status === 400) return json({ error: "Não deu para ler este áudio. Grave de novo, por favor." }, 400);
        return json({ error: "A transcrição está indisponível no momento. Seu áudio ficou guardado." }, r.status);
      }
    }

    // 2) ElevenLabs (reserva)
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsKey) {
      return json({ error: "A transcrição está instável. Toque em Tentar de novo em alguns segundos." }, gatewayFailure?.status || 503);
    }
    const { mime, ext } = audioFileInfo(clientMimeType);
    const langMap: Record<string, string> = { pt: "por", en: "eng", es: "spa" };
    const formData = new FormData();
    formData.append("file", new Blob([audioBytes as BlobPart], { type: mime }), `audio.${ext}`);
    formData.append("model_id", "scribe_v2");
    formData.append("language_code", langMap[language] || "por");
    formData.append("tag_audio_events", "false");
    formData.append("diarize", "false");

    const sttStart = Date.now();
    const aiResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: formData,
    });
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[AGENT-TRANSCRIBE] ElevenLabs error:", aiResponse.status, errorText.slice(0, 300));
      void logAIUsage({
        userId: user.id, assistant, functionName: "agent-transcribe",
        model: "elevenlabs/scribe_v2", audioSeconds, latencyMs: Date.now() - sttStart, status: "error",
        metadata: { http_status: aiResponse.status, quota_exceeded: errorText.includes("quota_exceeded") },
      });
      return json({ error: "A transcrição está instável. Toque em Tentar de novo em alguns segundos." }, 503);
    }
    const aiResult = await aiResponse.json();
    void logAIUsage({
      userId: user.id, assistant, functionName: "agent-transcribe",
      model: "elevenlabs/scribe_v2", audioSeconds, latencyMs: Date.now() - sttStart, status: "ok",
    });
    return json({
      success: true, transcription: (aiResult.text || "").trim(), duration: audioSeconds,
      language, processingTime: Date.now() - startTime, engine: "elevenlabs",
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return json({ error: "Não autorizado" }, 401);
    console.error("[AGENT-TRANSCRIBE] Error:", error?.message);
    return json({ error: "Erro ao processar áudio" }, 500);
  }
});
