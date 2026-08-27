import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
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

    const dataUrl = `data:${mimeType};base64,${file}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um extrator OCR de documentos médicos. Extraia TODO o texto preservando estrutura, valores numéricos, unidades, datas, horários, nomes de exames e achados clínicos. Retorne apenas o texto limpo em português, sem comentários.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia todo o conteúdo textual deste documento:" },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[extract-file-text] AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
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

    const aiResult = await aiResponse.json();
    const text = aiResult.choices?.[0]?.message?.content || "";

    void logAIUsage({
      userId: user.id,
      assistant: "ocr",
      functionName: "extract-file-text",
      model: "google/gemini-2.5-flash-lite",
      inputTokens: aiResult.usage?.prompt_tokens,
      outputTokens: aiResult.usage?.completion_tokens,
      totalTokens: aiResult.usage?.total_tokens,
      status: "ok",
      metadata: { mime: mimeType },
    });

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
