import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('Áudio não fornecido');
    }

    console.log('Processando áudio de prescrição...');

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper transcription
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'prescription.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'json');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Transcribe audio using Whisper via OpenAI-compatible endpoint
    console.log('Transcrevendo áudio...');
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error('Erro na transcrição:', error);
      throw new Error(`Erro ao transcrever áudio: ${error}`);
    }

    const transcription = await transcriptionResponse.json();
    console.log('Transcrição completa:', transcription.text);

    // Extract structured data using AI with tool calling
    console.log('Extraindo dados estruturados...');
    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico especializado em extrair informações estruturadas de prescrições ditadas por médicos.
Analise o texto transcrito e extraia:
- Nome do paciente (se mencionado)
- Diagnóstico
- Código CID (se mencionado)
- Lista de medicamentos com: nome completo, dosagem, frequência, duração do tratamento e instruções
- Observações gerais
- Validade em dias (se mencionado, senão use 30)

Seja preciso e extraia apenas informações claramente mencionadas. Se algo não for mencionado, use null ou valores vazios.`
          },
          {
            role: 'user',
            content: `Extraia as informações da seguinte prescrição ditada:\n\n${transcription.text}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_prescription_data',
              description: 'Extrai dados estruturados de uma prescrição médica ditada',
              parameters: {
                type: 'object',
                properties: {
                  patient_name: {
                    type: 'string',
                    description: 'Nome do paciente mencionado'
                  },
                  diagnosis: {
                    type: 'string',
                    description: 'Diagnóstico médico'
                  },
                  cid_code: {
                    type: 'string',
                    description: 'Código CID se mencionado'
                  },
                  medications: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Nome completo do medicamento' },
                        dosage: { type: 'string', description: 'Dosagem (ex: 500mg, 1 comprimido)' },
                        frequency: { type: 'string', description: 'Frequência (ex: 8 em 8 horas, 3x ao dia)' },
                        duration: { type: 'string', description: 'Duração do tratamento (ex: 7 dias, 2 semanas)' },
                        instructions: { type: 'string', description: 'Instruções adicionais' }
                      },
                      required: ['name', 'dosage', 'frequency', 'duration']
                    }
                  },
                  observations: {
                    type: 'string',
                    description: 'Observações gerais'
                  },
                  validity_days: {
                    type: 'number',
                    description: 'Validade da receita em dias'
                  }
                },
                required: ['medications']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_prescription_data' } }
      }),
    });

    if (!extractionResponse.ok) {
      const error = await extractionResponse.text();
      console.error('Erro na extração:', error);
      throw new Error(`Erro ao extrair dados: ${error}`);
    }

    const extractionResult = await extractionResponse.json();
    console.log('Resultado da extração:', JSON.stringify(extractionResult, null, 2));

    // Parse the tool call result
    const toolCall = extractionResult.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error('Não foi possível extrair dados estruturados da transcrição');
    }

    const prescriptionData = JSON.parse(toolCall.function.arguments);
    console.log('Dados extraídos:', JSON.stringify(prescriptionData, null, 2));

    return new Response(
      JSON.stringify({
        transcription: transcription.text,
        data: prescriptionData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
