import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      console.error("[AGENT-TRANSCRIBE] OPENAI_API_KEY not configured");
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
    const { audio, language = "pt", context } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "Áudio não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AGENT-TRANSCRIBE] Processing audio, context: ${context || 'none'}`);

    // Process audio from base64
    const binaryAudio = processBase64Chunks(audio);
    console.log(`[AGENT-TRANSCRIBE] Audio size: ${binaryAudio.length} bytes`);

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(binaryAudio).buffer as ArrayBuffer], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", language);
    formData.append("response_format", "verbose_json");
    
    // Add medical prompt for better accuracy
    const medicalPrompt = `Transcrição médica em português brasileiro. Termos comuns: 
hemoglobina, hematócrito, leucócitos, plaquetas, creatinina, ureia, sódio, potássio, 
magnésio, cálcio, PCR, VHS, TGO, TGP, bilirrubina, albumina, glicemia, colesterol, 
triglicérides, TSH, T4 livre, gasometria arterial, pH, pCO2, pO2, bicarbonato, 
lactato, saturação, frequência cardíaca, pressão arterial, temperatura.`;
    
    formData.append("prompt", medicalPrompt);

    console.log("[AGENT-TRANSCRIBE] Sending to OpenAI Whisper...");

    // Call OpenAI Whisper API
    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("[AGENT-TRANSCRIBE] Whisper API error:", whisperResponse.status, errorText);
      
      if (whisperResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro na transcrição de áudio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await whisperResponse.json();
    const transcription = result.text || "";
    const duration = result.duration || 0;

    const processingTime = Date.now() - startTime;
    console.log(`[AGENT-TRANSCRIBE] Transcription complete in ${processingTime}ms`);
    console.log(`[AGENT-TRANSCRIBE] Duration: ${duration}s, Characters: ${transcription.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        duration,
        language: result.language || language,
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
