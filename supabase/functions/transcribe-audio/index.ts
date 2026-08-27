import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await requirePlatformAccess(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const RATE_LIMIT = 5;
    const WINDOW_MINUTES = 60;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("function_name", "transcribe-audio")
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateLimitError) console.error("Rate limit check error:", rateLimitError);

    if (rateLimitData && rateLimitData.request_count >= RATE_LIMIT) {
      const resetTime = new Date(new Date(rateLimitData.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      return new Response(
        JSON.stringify({
          error: "Limite de transcrições de áudio excedido. Tente novamente mais tarde.",
          resetAt: resetTime.toISOString()
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": RATE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toISOString()
          }
        }
      );
    }

    if (rateLimitData) {
      await supabase
        .from("rate_limits")
        .update({ request_count: rateLimitData.request_count + 1, updated_at: now.toISOString() })
        .eq("id", rateLimitData.id);
    } else {
      await supabase.from("rate_limits").insert({
        user_id: user.id,
        function_name: "transcribe-audio",
        request_count: 1,
        window_start: now.toISOString()
      });
    }

    const { evidenceId } = await req.json();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!evidenceId || !uuidRegex.test(evidenceId)) {
      return new Response(
        JSON.stringify({ error: "ID de evidência inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: evidence, error: fetchError } = await supabase
      .from("evidences")
      .select(`*, cases!inner(user_id)`)
      .eq("id", evidenceId)
      .single();

    if (fetchError) throw fetchError;

    if (evidence.cases?.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!evidence.file_path) throw new Error("No file path found for this evidence");

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("evidences")
      .download(evidence.file_path);
    if (downloadError) throw downloadError;

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente médico especializado em transcrever áudios clínicos.

Transcreva o áudio em português, preservando:
- Termos médicos e técnicos
- Nomes de medicamentos e dosagens
- Valores de sinais vitais
- Datas e horários mencionados
- Nomes de pacientes (se houver)

Formate a transcrição de forma clara e organizada, separando por parágrafos quando necessário.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreva este áudio médico:" },
              { type: "audio_url", audio_url: { url: `data:audio/webm;base64,${base64Audio}` } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao transcrever áudio. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const transcription = aiResult.choices?.[0]?.message?.content || "";
    const metadata = {
      processing_method: "transcription_gemini_flash",
      processed_at: new Date().toISOString(),
      char_count: transcription.length,
      word_count: transcription.split(/\s+/).filter(Boolean).length,
    };

    const { error: updateError } = await supabase
      .from("evidences")
      .update({
        content: transcription,
        metadata: { ...evidence.metadata, ...metadata },
      })
      .eq("id", evidenceId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcription.substring(0, 500) + "...",
        metadata,
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
    console.error("Error transcribing audio:", error.message);
    return new Response(
      JSON.stringify({ error: "Erro ao transcrever áudio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
