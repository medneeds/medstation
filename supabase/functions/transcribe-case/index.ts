import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    console.log('Processando áudio de caso clínico...');

    if (!audio) {
      throw new Error('Nenhum áudio fornecido');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log('Transcrevendo áudio com Whisper...');
    const binaryAudio = processBase64Chunks(audio);
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Erro na transcrição:', errorText);
      throw new Error('Erro ao transcrever áudio. Verifique se a chave OPENAI_API_KEY está válida.');
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcription = transcriptionData.text;
    
    console.log('Transcrição obtida:', transcription);

    // Step 2: Extract structured data using Lovable AI with tool calling
    console.log('Extraindo dados estruturados com IA...');
    
    const systemPrompt = `Você é um assistente médico especializado em extrair informações de casos clínicos a partir de transcrições de áudio.
Extraia as seguintes informações da transcrição:
- title: Título descritivo do caso (obrigatório)
- chief_complaint: Queixa principal do paciente
- notes: Observações e notas do caso
- tags: Array de tags relevantes (especialidades, sintomas, diagnósticos)

Se alguma informação não estiver presente, retorne null ou array vazio conforme apropriado.`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extraia os dados do seguinte caso clínico:\n\n${transcription}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_case_data',
              description: 'Extrai dados estruturados de um caso clínico',
              parameters: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Título descritivo do caso clínico'
                  },
                  chief_complaint: {
                    type: 'string',
                    description: 'Queixa principal do paciente'
                  },
                  notes: {
                    type: 'string',
                    description: 'Observações e notas sobre o caso'
                  },
                  tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags relevantes (especialidades, sintomas, diagnósticos)'
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

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('Erro na extração:', errorText);
      
      if (extractionResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde alguns segundos.');
      }
      if (extractionResponse.status === 402) {
        throw new Error('Créditos esgotados. Entre em contato com o suporte.');
      }
      
      throw new Error('Erro ao processar dados com IA');
    }

    const extractionData = await extractionResponse.json();
    console.log('Resposta da IA:', JSON.stringify(extractionData, null, 2));

    // Parse the tool call response
    const toolCall = extractionData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('IA não retornou dados estruturados');
    }

    const caseData = JSON.parse(toolCall.function.arguments);
    
    // Validate required fields
    if (!caseData.title) {
      throw new Error('Título do caso não foi identificado');
    }

    console.log('Dados extraídos:', caseData);

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
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
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao processar áudio'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
