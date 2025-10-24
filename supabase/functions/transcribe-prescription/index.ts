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

    // Get API keys
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada. Configure em Settings -> Secrets.');
    }
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper transcription
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'prescription.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'json');

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log('Transcrevendo áudio com Whisper...');
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      console.error('Erro na transcrição:', error);
      throw new Error(`Erro ao transcrever áudio. Verifique se a chave OPENAI_API_KEY está válida.`);
    }

    const transcription = await transcriptionResponse.json();
    const transcribedText = transcription.text;
    console.log('Transcrição completa:', transcribedText);

    if (!transcribedText || transcribedText.trim().length === 0) {
      throw new Error('Não foi possível transcrever o áudio. Tente gravar novamente com melhor qualidade.');
    }

    // Step 2: Extract structured data using Lovable AI with tool calling
    console.log('Extraindo dados estruturados com IA...');
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
            content: `Você é um assistente médico especializado em extrair informações estruturadas de prescrições ditadas por médicos brasileiros.

INSTRUÇÕES IMPORTANTES:
- Analise cuidadosamente o texto transcrito
- Extraia APENAS informações claramente mencionadas
- Para medicamentos, separe claramente: nome, dosagem, frequência, duração
- Se algo não for mencionado, use null
- Seja preciso com dosagens e frequências
- Mantenha a formatação médica correta

Exemplos de extração:
- "Amoxicilina 500mg de 8 em 8 horas por 7 dias" → nome: "Amoxicilina", dosagem: "500mg", frequência: "8 em 8 horas", duração: "7 dias"
- "Dipirona 1 grama 4 vezes ao dia se dor" → nome: "Dipirona", dosagem: "1g", frequência: "4x ao dia", duração: "uso conforme necessário", instructions: "se dor"`
          },
          {
            role: 'user',
            content: `Extraia as informações estruturadas da seguinte prescrição médica ditada:

"${transcribedText}"

Extraia todos os dados mencionados incluindo: paciente (se mencionado), diagnóstico, CID (se mencionado), medicamentos completos, observações e validade.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_prescription_data',
              description: 'Extrai dados estruturados de uma prescrição médica ditada em português',
              parameters: {
                type: 'object',
                properties: {
                  patient_name: {
                    type: 'string',
                    description: 'Nome do paciente se mencionado na prescrição'
                  },
                  diagnosis: {
                    type: 'string',
                    description: 'Diagnóstico médico ou hipótese diagnóstica'
                  },
                  cid_code: {
                    type: 'string',
                    description: 'Código CID-10 se mencionado (ex: J00, I10, E11.9)'
                  },
                  medications: {
                    type: 'array',
                    description: 'Lista completa de medicamentos prescritos',
                    items: {
                      type: 'object',
                      properties: {
                        name: { 
                          type: 'string', 
                          description: 'Nome completo do medicamento (ex: Amoxicilina, Dipirona Sódica)'
                        },
                        dosage: { 
                          type: 'string', 
                          description: 'Dosagem unitária (ex: 500mg, 1 comprimido, 20 gotas)'
                        },
                        frequency: { 
                          type: 'string', 
                          description: 'Frequência de uso (ex: 8 em 8 horas, 3x ao dia, 12/12h)'
                        },
                        duration: { 
                          type: 'string', 
                          description: 'Duração do tratamento (ex: 7 dias, 14 dias, uso contínuo)'
                        },
                        instructions: { 
                          type: 'string', 
                          description: 'Instruções adicionais (ex: tomar em jejum, se dor, após refeições)'
                        }
                      },
                      required: ['name', 'dosage', 'frequency', 'duration'],
                      additionalProperties: false
                    }
                  },
                  observations: {
                    type: 'string',
                    description: 'Observações gerais, recomendações ou orientações ao paciente'
                  },
                  validity_days: {
                    type: 'number',
                    description: 'Validade da receita em dias (padrão: 30 se não mencionado)'
                  }
                },
                required: ['diagnosis', 'medications'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_prescription_data' } }
      }),
    });

    if (!extractionResponse.ok) {
      const error = await extractionResponse.text();
      console.error('Erro na extração IA:', error);
      
      // Se houver erro de rate limit ou payment
      if (extractionResponse.status === 429) {
        throw new Error('Limite de uso da IA atingido. Tente novamente em alguns instantes.');
      }
      if (extractionResponse.status === 402) {
        throw new Error('Créditos da IA esgotados. Adicione créditos em Settings -> Workspace -> Usage.');
      }
      
      throw new Error(`Erro ao processar com IA: ${error}`);
    }

    const extractionResult = await extractionResponse.json();
    console.log('Resposta da IA:', JSON.stringify(extractionResult, null, 2));

    // Parse the tool call result
    const toolCall = extractionResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('Resposta da IA sem tool call:', extractionResult);
      throw new Error('Não foi possível extrair dados estruturados. A IA não retornou o formato esperado.');
    }

    let prescriptionData;
    try {
      prescriptionData = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Erro ao parsear argumentos:', toolCall.function.arguments);
      throw new Error('Erro ao processar resposta da IA');
    }

    console.log('Dados extraídos:', JSON.stringify(prescriptionData, null, 2));

    // Validate that we have at least the required fields
    if (!prescriptionData.diagnosis || !prescriptionData.medications || prescriptionData.medications.length === 0) {
      console.error('Dados incompletos:', prescriptionData);
      throw new Error('A transcrição não contém informações suficientes. Certifique-se de mencionar diagnóstico e medicamentos.');
    }

    // Set default validity if not provided
    if (!prescriptionData.validity_days) {
      prescriptionData.validity_days = 30;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcribedText,
        data: prescriptionData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar áudio' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
