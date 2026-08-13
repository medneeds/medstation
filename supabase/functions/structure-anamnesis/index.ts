import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logAIUsage } from "../_shared/ai-logger.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { transcription, mode } = await req.json();

    if (!transcription) {
      throw new Error('Transcrição não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // ---- Modo resumo inteligente ------------------------------------------
    if (mode === 'summary') {
      const summaryPrompt = `Você é um médico experiente resumindo uma consulta para o prontuário.

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- NUNCA use markdown: nada de #, ##, **, *, _ ou tabelas
- Use APENAS cabeçalhos em CAIXA ALTA, linhas em branco e marcadores com "-"

REGRAS CLÍNICAS:
- Use somente o que foi dito na consulta; não invente nem infira dados
- Preserve negativas relevantes (nega alergias, nega HAS)
- Linguagem técnica de prontuário, objetiva

ESTRUTURA DO RESUMO:

SÍNTESE DO CASO
- 2 a 4 linhas com o quadro central

PONTOS-CHAVE
- marcadores com os achados mais relevantes

PENDÊNCIAS E ALERTAS
- o que ficou em aberto, sinais de alarme, informações faltantes

PRÓXIMOS PASSOS
- conduta e seguimento mencionados; se não houver, escreva "Não registrado na consulta"`;

      const sres = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: summaryPrompt },
            { role: 'user', content: `Transcrição da consulta:\n\n${transcription}` },
          ],
        }),
      });

      if (!sres.ok) {
        const errText = await sres.text();
        console.error('Lovable AI summary error:', errText);
        if (sres.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (sres.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Créditos de IA esgotados.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error(`Erro no resumo: ${sres.status}`);
      }

      const sdata = await sres.json();
      void logAIUsage({
        userId: user.id,
        assistant: 'consultorio',
        functionName: 'structure-anamnesis:summary',
        model: 'google/gemini-3-flash-preview',
        inputTokens: sdata.usage?.prompt_tokens,
        outputTokens: sdata.usage?.completion_tokens,
        totalTokens: sdata.usage?.total_tokens,
        status: 'ok',
      });

      const summary = (sdata.choices?.[0]?.message?.content || '').trim();
      return new Response(
        JSON.stringify({ summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    const systemPrompt = `Você é um assistente médico especializado em estruturação de anamneses.

Analise a transcrição da consulta médica e organize em seções clínicas padronizadas.

REGRAS IMPORTANTES:
1. Extraia APENAS informações explicitamente mencionadas - NÃO infira dados
2. Mantenha a linguagem técnica apropriada para prontuário médico
3. Se uma seção não tiver dados mencionados, deixe em branco (string vazia)
4. Preserve dados negativos importantes (ex: "nega HAS", "nega alergias")
5. Para medicamentos, inclua dose e posologia se mencionadas
6. Use termos médicos adequados (ex: "epigastralgia" ao invés de "dor na barriga")
7. Seja conciso mas completo

SEÇÕES PARA ESTRUTURAR:
- chiefComplaint: Queixa principal (sintoma principal e duração)
- historyPresentIllness: História da doença atual (caracterização do quadro)
- pastMedicalHistory: História patológica pregressa (doenças, cirurgias, internações)
- familyHistory: História familiar
- medications: Medicamentos em uso
- allergies: Alergias conhecidas
- socialHistory: Hábitos de vida (tabagismo, etilismo, atividade física)
- reviewOfSystems: Revisão de sistemas
- physicalExam: Exame físico (se mencionado)
- diagnosticHypotheses: Hipóteses diagnósticas (se mencionadas)
- plan: Conduta proposta (se mencionada)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcrição da consulta:\n\n${transcription}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'structure_anamnesis',
              description: 'Estrutura a anamnese em seções clínicas padronizadas',
              parameters: {
                type: 'object',
                properties: {
                  chiefComplaint: { 
                    type: 'string', 
                    description: 'Queixa principal com duração' 
                  },
                  historyPresentIllness: { 
                    type: 'string', 
                    description: 'História da doença atual detalhada' 
                  },
                  pastMedicalHistory: { 
                    type: 'string', 
                    description: 'Antecedentes patológicos' 
                  },
                  familyHistory: { 
                    type: 'string', 
                    description: 'História familiar' 
                  },
                  medications: { 
                    type: 'string', 
                    description: 'Medicamentos em uso com doses' 
                  },
                  allergies: { 
                    type: 'string', 
                    description: 'Alergias conhecidas' 
                  },
                  socialHistory: { 
                    type: 'string', 
                    description: 'Hábitos de vida' 
                  },
                  reviewOfSystems: { 
                    type: 'string', 
                    description: 'Revisão de sistemas' 
                  },
                  physicalExam: { 
                    type: 'string', 
                    description: 'Achados do exame físico' 
                  },
                  diagnosticHypotheses: { 
                    type: 'string', 
                    description: 'Hipóteses diagnósticas' 
                  },
                  plan: { 
                    type: 'string', 
                    description: 'Conduta proposta' 
                  },
                },
                required: ['chiefComplaint'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'structure_anamnesis' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na estruturação: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    void logAIUsage({
      userId: user.id,
      assistant: "consultorio",
      functionName: "structure-anamnesis",
      model: "google/gemini-3-flash-preview",
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      status: "ok",
    });

    // Extract structured data from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Resposta inválida da IA');
    }

    const structure = JSON.parse(toolCall.function.arguments);
    console.log('Anamnesis structured successfully');

    return new Response(
      JSON.stringify({ structure }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in structure-anamnesis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
