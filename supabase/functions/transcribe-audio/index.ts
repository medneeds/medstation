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
    const { evidenceId } = await req.json();

    if (!evidenceId) {
      throw new Error("Evidence ID is required");
    }

    console.log(`Transcribing audio for evidence: ${evidenceId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get evidence data
    const { data: evidence, error: fetchError } = await supabase
      .from("evidences")
      .select("*")
      .eq("id", evidenceId)
      .single();

    if (fetchError) throw fetchError;

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
        model: "google/gemini-2.5-flash",
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
      const errorText = await aiResponse.text();
      console.error("AI transcription error:", errorText);
      throw new Error(`Transcription failed: ${errorText}`);
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
    console.error("Error transcribing audio:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
