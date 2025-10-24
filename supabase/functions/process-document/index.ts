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

    const { evidenceId } = await req.json();

    if (!evidenceId) {
      throw new Error("Evidence ID is required");
    }

    console.log(`Processing document for evidence: ${evidenceId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`Evidence type: ${evidence.type}, file: ${evidence.file_path}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("evidences")
      .download(evidence.file_path);

    if (downloadError) throw downloadError;

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    let extractedText = "";
    let metadata: any = {};

    // Process based on type
    if (evidence.type === "pdf" || evidence.type === "image") {
      console.log("Processing with OCR using Lovable AI");

      // Use Gemini Pro for vision + OCR
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `Você é um assistente médico especializado em extrair informações de documentos clínicos.
              
Extraia TODO o texto do documento, preservando:
- Estrutura e formatação
- Valores numéricos e unidades
- Datas e horários
- Nomes de exames e resultados
- Achados clínicos

Retorne o texto limpo e organizado em português, sem adicionar comentários ou interpretações.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia todo o conteúdo textual deste documento médico:",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64File}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", errorText);
        throw new Error(`AI processing failed: ${errorText}`);
      }

      const aiResult = await aiResponse.json();
      extractedText = aiResult.choices?.[0]?.message?.content || "";

      metadata = {
        processing_method: "ocr_gemini_pro",
        processed_at: new Date().toISOString(),
        char_count: extractedText.length,
        word_count: extractedText.split(/\s+/).filter(Boolean).length,
      };

      console.log(`Extracted ${extractedText.length} characters`);
    } else {
      throw new Error(`Unsupported evidence type for processing: ${evidence.type}`);
    }

    // Update evidence with extracted content
    const { error: updateError } = await supabase
      .from("evidences")
      .update({
        content: extractedText,
        metadata: {
          ...evidence.metadata,
          ...metadata,
        },
      })
      .eq("id", evidenceId);

    if (updateError) throw updateError;

    console.log("Document processing completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        extracted_text: extractedText.substring(0, 500) + "...",
        metadata,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
