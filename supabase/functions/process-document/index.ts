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

    // Rate limiting check (10 documents per hour)
    const RATE_LIMIT = 10;
    const WINDOW_MINUTES = 60;
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", user.id)
      .eq("function_name", "process-document")
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
          error: "Limite de processamento de documentos excedido. Tente novamente mais tarde.",
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
          function_name: "process-document",
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

    console.log(`Processing document for evidence: ${evidenceId}`);

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
        console.error("AI processing failed with status:", aiResponse.status);
        return new Response(
          JSON.stringify({ error: "Falha ao processar documento. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    console.error("Error processing document:", error.message);
    return new Response(
      JSON.stringify({ error: "Erro ao processar documento" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
