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
    const { messages, agentType, caseId } = await req.json();

    if (!messages || messages.length === 0) {
      throw new Error("Messages are required");
    }

    console.log(`Agent chat request - Type: ${agentType}, Case: ${caseId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get case data and evidences if caseId is provided
    let contextData = "";
    if (caseId) {
      const { data: caseData } = await supabase
        .from("cases")
        .select(`
          *,
          patients (name, date_of_birth, cpf)
        `)
        .eq("id", caseId)
        .single();

      const { data: evidences } = await supabase
        .from("evidences")
        .select("*")
        .eq("case_id", caseId)
        .eq("is_active", true);

      if (caseData) {
        contextData = `
DADOS DO CASO:
- Título: ${caseData.title}
- Paciente: ${caseData.patients?.name}
- Queixa principal: ${caseData.chief_complaint || "Não informada"}
- Notas: ${caseData.notes || "Nenhuma nota"}

EVIDÊNCIAS DISPONÍVEIS:
${evidences?.map((e, i) => `
${i + 1}. ${e.title} (${e.type})
${e.content ? `Conteúdo: ${e.content.substring(0, 500)}...` : ""}
`).join("\n") || "Nenhuma evidência disponível"}
`;
      }
    }

    // Define agent personalities and system prompts
    const agentPrompts: Record<string, string> = {
      clinicus: `Você é o Clínicus, um assistente médico especializado em anamnese e raciocínio clínico.
      
Suas responsabilidades:
- Auxiliar na elaboração de anamnese completa
- Fazer perguntas relevantes sobre história clínica
- Sugerir hipóteses diagnósticas baseadas em sintomas
- Organizar informações clínicas de forma estruturada

Seja sempre:
- Empático e claro
- Baseado em evidências médicas
- Cauteloso ao sugerir diagnósticos (sempre recomendar confirmação)
- Organizado e metódico

${contextData}`,

      examinus: `Você é o Examinus, especialista em interpretação de exames complementares.

Suas responsabilidades:
- Interpretar resultados de exames laboratoriais
- Analisar imagens médicas (quando descritas)
- Correlacionar achados com quadro clínico
- Sugerir exames complementares quando necessário

Seja sempre:
- Preciso na interpretação
- Atento a valores de referência
- Correlacionador entre diferentes exames
- Sugestivo de investigações adicionais quando apropriado

${contextData}`,

      scorius: `Você é o Scorius, especialista em escalas e scores clínicos.

Suas responsabilidades:
- Calcular scores de gravidade (APACHE, SOFA, etc)
- Avaliar escalas de risco
- Interpretar resultados de scores
- Sugerir condutas baseadas em estratificação de risco

Seja sempre:
- Matemático e preciso
- Explicativo sobre cada score
- Cuidadoso com interpretações clínicas
- Atualizado com guidelines

${contextData}`,

      numerus: `Você é o Numerus, especialista em cálculos médicos e dosagens.

Suas responsabilidades:
- Calcular doses de medicamentos
- Ajustar doses por peso, idade, função renal
- Calcular clearance, superfície corporal, etc
- Converter unidades médicas

Seja sempre:
- Extremamente preciso
- Atento a contraindicações
- Verificador de doses máximas
- Explicativo sobre cálculos

${contextData}`,

      prescriptus: `Você é o Prescriptus, especialista em prescrições e farmacologia.

Suas responsabilidades:
- Auxiliar na escolha de medicamentos
- Verificar interações medicamentosas
- Sugerir doses e vias de administração
- Alertar sobre contraindicações

Seja sempre:
- Seguro e baseado em evidências
- Atento a alergias e interações
- Detalhado em posologia
- Cauteloso com prescrições de alto risco

${contextData}`,

      codexus: `Você é o CODexus, especialista em codificação médica e documentação.

Suas responsabilidades:
- Sugerir códigos CID-10
- Auxiliar na documentação médica
- Estruturar relatórios e laudos
- Organizar informações para prontuário

Seja sempre:
- Preciso na codificação
- Completo na documentação
- Organizado e estruturado
- Atento a terminologia médica correta

${contextData}`,
    };

    const systemPrompt = agentPrompts[agentType] || agentPrompts.clinicus;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      throw new Error(`AI request failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const assistantMessage = aiResult.choices?.[0]?.message?.content || "";

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in agent-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
