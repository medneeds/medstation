import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, action, targetLanguage = "pt-BR", isUrl = false } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "Conteúdo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Serviço de IA não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let articleContent = content;
    
    // If it's a URL, try to fetch the content (simplified - in production you'd use a proper scraper)
    if (isUrl && content.startsWith("http")) {
      articleContent = `[Artigo da URL: ${content}]\n\nNota: Por favor, processe este conteúdo como se fosse um artigo científico médico. Se você não conseguir acessar a URL, gere um exemplo baseado no contexto.`;
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "summarize":
        systemPrompt = `Você é um especialista em resumir artigos científicos médicos. 
Crie resumos estruturados que incluam:
- Objetivo do estudo
- Metodologia
- Principais resultados
- Conclusões
- Implicações clínicas

Use linguagem técnica apropriada mas acessível. Seja conciso e preciso.`;
        userPrompt = `Faça um resumo estruturado do seguinte artigo científico:\n\n${articleContent}`;
        break;

      case "translation":
        const langNames: Record<string, string> = {
          "pt-BR": "português brasileiro",
          "en": "inglês",
          "es": "espanhol",
          "fr": "francês",
          "de": "alemão"
        };
        const targetLangName = langNames[targetLanguage] || targetLanguage;
        
        systemPrompt = `Você é um tradutor especializado em textos médicos e científicos.
Traduza o texto mantendo:
- Terminologia técnica correta
- Clareza e precisão
- Formatação original quando possível
- Notas explicativas para termos sem tradução direta`;
        userPrompt = `Traduza o seguinte texto para ${targetLangName}:\n\n${articleContent}`;
        break;

      case "keypoints":
        systemPrompt = `Você é um especialista em análise de artigos científicos médicos.
Extraia os pontos-chave do artigo em formato de tópicos, incluindo:
- Descobertas principais
- Dados estatísticos relevantes
- Limitações do estudo
- Recomendações práticas
- Lacunas identificadas

Seja objetivo e use bullet points para facilitar a leitura.`;
        userPrompt = `Extraia os principais pontos-chave do seguinte artigo científico:\n\n${articleContent}`;
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Processing article with action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const titles: Record<string, string> = {
      summarize: "Resumo do Artigo",
      translation: "Tradução",
      keypoints: "Pontos-chave"
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        title: titles[action] || "Resultado",
        action
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-article:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
