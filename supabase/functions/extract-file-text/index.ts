import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";
import { extractTextFromImage, OcrHttpError } from "../_shared/ocr.ts";


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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const { file, fileName, mimeType } = await req.json();

    if (!file || !mimeType) {
      return new Response(JSON.stringify({ error: "Arquivo inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return new Response(
        JSON.stringify({ error: "Apenas imagens e PDFs são suportados nesta rota" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[extract-file-text] user=${user.id} file=${fileName} type=${mimeType}`);

    let result;
    try {
      result = await extractTextFromImage(lovableApiKey, file, mimeType);
    } catch (err) {
      const status = err instanceof OcrHttpError ? err.status : 500;
      console.error("[extract-file-text] AI error:", status, err instanceof Error ? err.message : err);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no Lovable Cloud." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao extrair texto" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = result.text;

    void logAIUsage({
      userId: user.id,
      assistant: "ocr",
      functionName: "extract-file-text",
      model: result.model,
      inputTokens: result.usage?.prompt_tokens,
      outputTokens: result.usage?.completion_tokens,
      totalTokens: result.usage?.total_tokens,
      status: text ? "ok" : "empty",
      metadata: { mime: mimeType },
    });

    if (!text) {
      return new Response(
        JSON.stringify({
          error:
            "Não consegui ler este arquivo. Envie uma foto mais nítida, com o documento inteiro enquadrado e boa iluminação.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    console.error("[extract-file-text] error:", error.message);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
