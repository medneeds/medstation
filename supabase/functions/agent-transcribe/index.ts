import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

  const startTime = Date.now();
  console.log("[AGENT-TRANSCRIBE] Function started");

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[AGENT-TRANSCRIBE] No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // ElevenLabs Scribe - high-fidelity medical transcription
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenLabsKey) {
      console.error("[AGENT-TRANSCRIBE] ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de transcrição não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[AGENT-TRANSCRIBE] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-TRANSCRIBE] User authenticated: ${user.id}`);

    // Check subscription status using Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[AGENT-TRANSCRIBE] STRIPE_SECRET_KEY not set");
      return new Response(
        JSON.stringify({ error: "Funcionalidade não disponível", requiresPro: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin (bypass subscription check)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    if (!isAdmin) {
      // Check Stripe subscription
      const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      
      if (customers.data.length === 0) {
        console.log("[AGENT-TRANSCRIBE] No Stripe customer found - requires Pro");
        return new Response(
          JSON.stringify({ 
            error: "Reconhecimento de voz disponível apenas no plano Pro",
            requiresPro: true 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        console.log("[AGENT-TRANSCRIBE] No active subscription - requires Pro");
        return new Response(
          JSON.stringify({ 
            error: "Reconhecimento de voz disponível apenas no plano Pro",
            requiresPro: true 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[AGENT-TRANSCRIBE] User has active Pro subscription");
    } else {
      console.log("[AGENT-TRANSCRIBE] User is admin - bypassing subscription check");
    }

    // Parse request
    const { audio, language = "pt", context, mimeType: clientMimeType } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "Áudio não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-TRANSCRIBE] Processing audio with ElevenLabs Scribe, context: ${context || 'none'}, mimeType: ${clientMimeType || 'not specified'}`);
    console.log(`[AGENT-TRANSCRIBE] Audio base64 length: ${audio.length}`);

    // Decode base64 -> binary
    const binaryString = atob(audio);
    const audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }

    // Determine extension/mime
    const mime = clientMimeType || "audio/webm";
    let ext = "webm";
    if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
    else if (mime.includes("ogg")) ext = "ogg";
    else if (mime.includes("wav")) ext = "wav";
    else if (mime.includes("mpeg") || mime.includes("mp3")) ext = "mp3";

    const audioBlob = new Blob([audioBytes], { type: mime.split(";")[0] });

    // Map language to ISO 639-3 for ElevenLabs
    const langMap: Record<string, string> = { pt: "por", en: "eng", es: "spa" };
    const languageCode = langMap[language] || "por";

    const formData = new FormData();
    formData.append("file", audioBlob, `audio.${ext}`);
    formData.append("model_id", "scribe_v2");
    formData.append("language_code", languageCode);
    formData.append("tag_audio_events", "false");
    formData.append("diarize", "false");

    const aiResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: formData,
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[AGENT-TRANSCRIBE] ElevenLabs error:", aiResponse.status, errorText);

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
    console.log(`[AGENT-TRANSCRIBE] Transcription complete in ${processingTime}ms`);
    console.log(`[AGENT-TRANSCRIBE] Result preview: ${transcription.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        duration: 0, // Gemini doesn't provide duration
        language: language,
        processingTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[AGENT-TRANSCRIBE] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar áudio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
