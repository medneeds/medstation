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
    const { text } = await req.json();
    console.log('Extraindo dados de caso clínico do documento...');

    if (!text) {
      throw new Error('Nenhum texto fornecido');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um assistente médico especializado em extrair informações de documentos médicos para criar casos clínicos estruturados.

Analise o documento e extraia as seguintes informações:
- title: Título descritivo e conciso do caso (máximo 100 caracteres)
- chief_complaint: Queixa principal do paciente (se mencionada)
- notes: Descrição detalhada do caso incluindo histórico, evolução, diagnósticos, tratamentos, etc.
- tags: Array de tags relevantes (especialidades, diagnósticos, sintomas principais, procedimentos)

Se alguma informação não estiver presente no documento, retorne null ou array vazio conforme apropriado.
Extraia o máximo de informação relevante possível para o campo notes/descrição.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extraia os dados do seguinte documento médico:\n\n${text.slice(0, 15000)}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_case_data',
              description: 'Extrai dados estruturados de um documento médico para criar um caso clínico',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Título descritivo e conciso do caso clínico'
                  },
                  chief_complaint: {
                    type: 'string',
                    description: 'Queixa principal do paciente'
                  },
                  notes: {
                    type: 'string',
                    description: 'Descrição detalhada do caso incluindo todos os detalhes relevantes do documento'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags relevantes (especialidades, diagnósticos, sintomas, procedimentos)'
                  }
                },
                required: ['title'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_case_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns segundos.');
      }
      if (response.status === 402) {
        throw new Error('Créditos esgotados. Entre em contato com o suporte.');
      }
      
      throw new Error('Erro ao processar documento com IA');
    }

    const data = await response.json();
    console.log('Resposta da IA:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('IA não retornou dados estruturados');
    }

    const caseData = JSON.parse(toolCall.function.arguments);
    
    if (!caseData.title) {
      throw new Error('Título do caso não foi identificado');
    }

    console.log('Dados extraídos:', caseData);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: caseData.title || '',
          chief_complaint: caseData.chief_complaint || '',
          notes: caseData.notes || '',
          tags: Array.isArray(caseData.tags) ? caseData.tags : []
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao extrair dados do documento'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
