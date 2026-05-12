import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_type, diagnosis, observations, cid_code, validity_days } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Definir prompt baseado no tipo de documento
    let systemPrompt = "";
    let userPrompt = "";

    switch (document_type) {
      case "laudo":
        systemPrompt = `Você é um médico especialista gerando um laudo médico profissional. 
O laudo deve ser técnico, detalhado e seguir padrões médicos brasileiros.
Inclua: identificação do exame, técnica utilizada, achados, impressão diagnóstica e recomendações.`;
        userPrompt = `Gere um laudo médico completo baseado nas seguintes informações:

Diagnóstico: ${diagnosis || "Não especificado"}
CID-10: ${cid_code || "Não especificado"}
Observações: ${observations || "Nenhuma"}

O laudo deve ser profissional, técnico e seguir os padrões médicos brasileiros.`;
        break;

      case "relatorio":
        systemPrompt = `Você é um médico gerando um relatório médico detalhado.
O relatório deve descrever a evolução clínica, procedimentos realizados, diagnósticos e orientações.
Mantenha tom profissional e linguagem técnica adequada.`;
        userPrompt = `Gere um relatório médico completo baseado nas seguintes informações:

Diagnóstico: ${diagnosis || "Não especificado"}
CID-10: ${cid_code || "Não especificado"}
Observações: ${observations || "Nenhuma"}

O relatório deve incluir histórico, exame físico, evolução, diagnósticos e plano terapêutico.`;
        break;

      case "atestado":
        systemPrompt = `Você é um médico emitindo um atestado médico.
O atestado deve ser objetivo, claro e seguir as normas do Conselho Federal de Medicina.
Inclua: diagnóstico (sem detalhes excessivos), período de afastamento e recomendações.`;
        userPrompt = `Gere um atestado médico profissional baseado nas seguintes informações:

Diagnóstico: ${diagnosis || "Afastamento para tratamento de saúde"}
CID-10: ${cid_code || "Não especificado"}
Dias de afastamento: ${validity_days || 1} dias
Observações: ${observations || "Nenhuma"}

O atestado deve ser objetivo e seguir as normas do CFM.`;
        break;

      default:
        throw new Error("Tipo de documento inválido");
    }

    console.log("Gerando documento:", document_type);

    // Chamar Lovable AI
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erro da API:", errorText);
      throw new Error(`Erro ao gerar documento: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta da IA vazia");
    }

    // Gerar título se não fornecido
    let title = "";
    switch (document_type) {
      case "laudo":
        title = `Laudo Médico - ${diagnosis?.substring(0, 50) || "Exame"}`;
        break;
      case "relatorio":
        title = `Relatório Médico - ${diagnosis?.substring(0, 50) || "Consulta"}`;
        break;
      case "atestado":
        title = `Atestado Médico - ${validity_days || 1} dia(s)`;
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        title,
        content,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao gerar documento:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
