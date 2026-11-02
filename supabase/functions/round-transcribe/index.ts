import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Transcreve UMA parte (~10 min) da gravação do round multiprofissional.
// O áudio já está no armazenamento privado (round-audio/{user}/{sessão}/part-NN.ext).
// 1º) IA da plataforma; 2º) ElevenLabs só em falha passageira.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const { user } = await requirePlatformAccess(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    const path = typeof body?.path === "string" ? body.path : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.slice(0, 80) : "";
    if (!UUID.test(sessionId)) return json({ error: "Round inválido" }, 400);
    if (!path.startsWith(`${user.id}/${sessionId}/`) || path.includes("..") || path.length > 200) {
      return json({ error: "Arquivo inválido" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: session } = await admin
      .from("ward_round_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) return json({ error: "Round não encontrado" }, 404);

    const { data: file, error: dlError } = await admin.storage.from("round-audio").download(path);
    if (dlError || !file) return json({ error: "Parte da gravação não encontrada" }, 404);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength < 500) return json({ success: true, transcription: "" });
    if (bytes.byteLength > MAX_STT_BYTES) return json({ error: "Parte da gravação grande demais" }, 413);
    const audioSeconds = estimateAudioSecondsFromBytes(bytes.byteLength, 32);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      const t0 = Date.now();
      const r = await transcribeWithGateway(bytes, mimeType || file.type, lovableKey);
      void logAIUsage({
        userId: user.id, assistant: "carpe-diem", functionName: "round-transcribe",
        model: GATEWAY_STT_MODEL, audioSeconds: r.ok && r.seconds ? r.seconds : audioSeconds,
        latencyMs: Date.now() - t0, status: r.ok ? "ok" : "error",
        metadata: r.ok ? null : { http_status: r.status, error: r.message.slice(0, 300) },
      });
      if (r.ok) return json({ success: true, transcription: r.text, engine: "platform", ms: Date.now() - started });
      console.error("[ROUND-TRANSCRIBE] gateway error:", r.status, r.message.slice(0, 200));
      if (!canUseFallbackAfter(r.status)) {
        if (r.status === 402) return json({ error: "Os créditos de IA da plataforma acabaram. A gravação ficou guardada." }, 402);
        return json({ error: "Não deu para transcrever esta parte. A gravação ficou guardada." }, r.status);
      }
    }

    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenKey) return json({ error: "Transcrição instável. Tentando de novo." }, 503);
    const { mime, ext } = audioFileInfo(mimeType || file.type);
    const form = new FormData();
    form.append("file", new Blob([bytes as BlobPart], { type: mime }), `audio.${ext}`);
    form.append("model_id", "scribe_v2");
    form.append("language_code", "por");
    form.append("tag_audio_events", "false");
    form.append("diarize", "false");
    const t1 = Date.now();
    const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elevenKey },
      body: form,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[ROUND-TRANSCRIBE] ElevenLabs error:", resp.status, t.slice(0, 200));
      void logAIUsage({
        userId: user.id, assistant: "carpe-diem", functionName: "round-transcribe",
        model: "elevenlabs/scribe_v2", audioSeconds, latencyMs: Date.now() - t1, status: "error",
        metadata: { http_status: resp.status },
      });
      return json({ error: "Transcrição instável. Tentando de novo." }, 503);
    }
    const result = await resp.json();
    void logAIUsage({
      userId: user.id, assistant: "carpe-diem", functionName: "round-transcribe",
      model: "elevenlabs/scribe_v2", audioSeconds, latencyMs: Date.now() - t1, status: "ok",
    });
    return json({ success: true, transcription: String(result?.text || "").trim(), engine: "elevenlabs" });
  } catch (error: any) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return json({ error: "Não autorizado" }, 401);
    console.error("[ROUND-TRANSCRIBE] Error:", error?.message);
    return json({ error: "Erro ao transcrever a gravação" }, 500);
  }
});
