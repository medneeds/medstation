import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Rate limiting check (5 audio transcriptions per hour)
    const RATE_LIMIT = 5;
    const WINDOW_MINUTES = 60;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("function_name", "transcribe-audio")
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    }

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

    // Update or create rate limit record
    if (rateLimitData) {
      await supabase
        .from("rate_limits")
        .update({ 
          request_count: rateLimitData.request_count + 1,
          updated_at: now.toISOString()
        })
        .eq("id", rateLimitData.id);
    } else {
      await supabase
        .from("rate_limits")
        .insert({
          user_id: user.id,
          function_name: "transcribe-audio",
          request_count: 1,
          window_start: now.toISOString()
        });
    }

    console.log(`Rate limit check passed for user ${user.id}`);

    const { evidenceId } = await req.json();

    // Validate input
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!evidenceId || !uuidRegex.test(evidenceId)) {
      return new Response(
        JSON.stringify({ error: "ID de evidência inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Transcribing audio for evidence: ${evidenceId}`);

    // Get evidence data and verify user owns it through case
    const { data: evidence, error: fetchError } = await supabase
      .from("evidences")
      .select(`
        *,
        cases!inner(user_id)
      `)
      .eq("id", evidenceId)
      .single();

    if (fetchError) {
      console.error("Error fetching evidence:", fetchError);
      throw fetchError;
    }

    // Verify user owns the case
    if (evidence.cases?.user_id !== user.id) {
      console.error("Access denied: user does not own this evidence");
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!evidence.file_path) {
      throw new Error("No file path found for this evidence");
    }

    console.log(`Transcribing audio file: ${evidence.file_path}`);

    // Download audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("evidences")
      .download(evidence.file_path);

    if (downloadError) throw downloadError;

    // Convert audio to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log("Sending audio to Lovable AI for transcription");

    // Use Gemini Flash for audio transcription
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
              {
                type: "text",
                text: "Transcreva este áudio médico:",
              },
              {
                type: "audio_url",
                audio_url: {
                  url: `data:audio/webm;base64,${base64Audio}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI transcription failed with status:", aiResponse.status);
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

    console.log(`Transcribed ${transcription.length} characters`);

    // Update evidence with transcription
    const { error: updateError } = await supabase
      .from("evidences")
      .update({
        content: transcription,
        metadata: {
          ...evidence.metadata,
          ...metadata,
        },
      })
      .eq("id", evidenceId);

    if (updateError) throw updateError;

    console.log("Audio transcription completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcription.substring(0, 500) + "...",
        metadata,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error transcribing audio:", error.message);
    return new Response(
      JSON.stringify({ error: "Erro ao transcrever áudio" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
