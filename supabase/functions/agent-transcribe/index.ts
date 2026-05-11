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

    console.log(`[AGENT-TRANSCRIBE] Processing audio with Lovable AI (Gemini), context: ${context || 'none'}, mimeType: ${clientMimeType || 'not specified'}`);
    console.log(`[AGENT-TRANSCRIBE] Audio base64 length: ${audio.length}`);

    // Determine MIME type
    const getMimeType = (mime: string | undefined): string => {
      if (!mime) return 'audio/webm';
      if (mime.includes('mp4') || mime.includes('m4a')) return 'audio/mp4';
      if (mime.includes('ogg')) return 'audio/ogg';
      if (mime.includes('wav')) return 'audio/wav';
      if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio/mpeg';
      return 'audio/webm';
    };

    const audioMimeType = getMimeType(clientMimeType);
    console.log(`[AGENT-TRANSCRIBE] Using MIME type: ${audioMimeType}`);

    // Build data URL for Gemini multimodal input
    const audioDataUrl = `data:${audioMimeType};base64,${audio}`;

    // Use Gemini for audio transcription via Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente médico especializado em transcrever áudios clínicos em português brasileiro.

INSTRUÇÕES CRÍTICAS:
1. Transcreva o áudio EXATAMENTE como foi falado
2. Preserve todos os termos médicos e técnicos com precisão
3. Mantenha nomes de medicamentos, dosagens e valores exatos
4. Use pontuação adequada para refletir pausas e entonações
5. NÃO adicione interpretações, resumos ou comentários
6. Se o áudio estiver inaudível/silêncio, retorne string vazia.
7. Retorne APENAS a transcrição

Vocabulário médico comum:
- Sinais vitais: pressão arterial, frequência cardíaca, saturação, temperatura, glicemia
- Exames: hemograma, creatinina, ureia, sódio, potássio, TGO, TGP, bilirrubina, TSH, gasometria
- Medicamentos: omeprazol, losartana, metformina, sinvastatina, AAS, dipirona, paracetamol, ibuprofeno
- Termos: anamnese, hipótese diagnóstica, conduta, prescrição, evolução, prognóstico`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcreva o áudio a seguir com precisão médica. Retorne APENAS a transcrição (ou vazio se não der para entender):"
              },
              {
                type: "audio_url",
                audio_url: {
                  url: audioDataUrl
                }
              }
            ]
          }
        ],
        temperature: 0, // minimize hallucinations
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[AGENT-TRANSCRIBE] Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro na transcrição de áudio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const transcription = aiResult.choices?.[0]?.message?.content?.trim() || "";

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
