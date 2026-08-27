import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { estimateAudioSecondsFromBytes } from "../_shared/auth-helpers.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[AGENT-TRANSCRIBE] Function started");

  try {
    const { user, access } = await requirePlatformAccess(req);
    console.log(`[AGENT-TRANSCRIBE] Access granted: user=${user.id} status=${access.status}`);

    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsKey) {
      console.error("[AGENT-TRANSCRIBE] ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de transcrição não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { audio, language = "pt", context, mimeType: clientMimeType } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "Áudio não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-TRANSCRIBE] Processing audio with ElevenLabs Scribe, context: ${context || 'none'}, mimeType: ${clientMimeType || 'not specified'}`);
    console.log(`[AGENT-TRANSCRIBE] Audio base64 length: ${audio.length}`);

    const binaryString = atob(audio);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }
    const audioSeconds = estimateAudioSecondsFromBytes(audioBytes.byteLength);

    const mime = clientMimeType || "audio/webm";
    let ext = "webm";
    if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
    else if (mime.includes("ogg")) ext = "ogg";
    else if (mime.includes("wav")) ext = "wav";
    else if (mime.includes("mpeg") || mime.includes("mp3")) ext = "mp3";

    const audioBlob = new Blob([audioBytes], { type: mime.split(";")[0] });
    const langMap: Record<string, string> = { pt: "por", en: "eng", es: "spa" };
    const languageCode = langMap[language] || "por";

    const formData = new FormData();
    formData.append("file", audioBlob, `audio.${ext}`);
    formData.append("model_id", "scribe_v2");
    formData.append("language_code", languageCode);
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
      console.error("[AGENT-TRANSCRIBE] ElevenLabs error:", aiResponse.status, errorText);
      void logAIUsage({
        userId: user.id, assistant: context || 'agent', functionName: 'agent-transcribe',
        model: 'elevenlabs/scribe_v2', audioSeconds, latencyMs: Date.now() - sttStart, status: 'error',
      });

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Chave de transcrição inválida" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro na transcrição de áudio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const transcription = (aiResult.text || "").trim();

    const processingTime = Date.now() - startTime;
    void logAIUsage({
      userId: user.id, assistant: context || 'agent', functionName: 'agent-transcribe',
      model: 'elevenlabs/scribe_v2', audioSeconds, latencyMs: Date.now() - sttStart, status: 'ok',
    });

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        duration: audioSeconds,
        language,
        processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("[AGENT-TRANSCRIBE] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar áudio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
