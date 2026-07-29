import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { getUserIdFromAuth, estimateAudioSecondsFromBytes } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    for (let i = 0; i < binaryChunk.length; i++) bytes[i] = binaryChunk.charCodeAt(i);
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
    const body = await req.json();
    const { audio, transcript: providedTranscript } = body;

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    let transcription = (providedTranscript ?? '').toString().trim();

    // If transcript not provided, transcribe the audio (prefer ElevenLabs Scribe v2 for PT-BR quality)
    if (!transcription) {
      if (!audio) throw new Error('Nenhum áudio nem texto fornecido');
      const binaryAudio = processBase64Chunks(audio);
      const blob = new Blob([binaryAudio], { type: 'audio/webm' });

      if (ELEVENLABS_API_KEY) {
        console.log('Transcrevendo com ElevenLabs Scribe v2...');
        const fd = new FormData();
        fd.append('file', blob, 'audio.webm');
        fd.append('model_id', 'scribe_v2');
        fd.append('language_code', 'por');
        const resp = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
          method: 'POST',
          headers: { 'xi-api-key': ELEVENLABS_API_KEY },
          body: fd,
        });
        if (!resp.ok) {
          const err = await resp.text();
          console.error('ElevenLabs error:', err);
          throw new Error('Falha na transcrição (ElevenLabs).');
        }
        const data = await resp.json();
        transcription = data.text ?? '';
      } else if (OPENAI_API_KEY) {
        console.log('Transcrevendo com Whisper (fallback)...');
        const fd = new FormData();
        fd.append('file', blob, 'audio.webm');
        fd.append('model', 'whisper-1');
        fd.append('language', 'pt');
        const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: fd,
        });
        if (!resp.ok) throw new Error('Falha na transcrição (Whisper).');
        const data = await resp.json();
        transcription = data.text ?? '';
      } else {
        throw new Error('Nenhuma chave de transcrição configurada');
      }
    }

    if (!transcription) throw new Error('Transcrição vazia');

    const systemPrompt = `Você extrai dados estruturados de casos clínicos a partir de transcrições.
Campos:
- title: título descritivo (obrigatório)
- chief_complaint: queixa principal
- notes: observações e histórico
- tags: array com especialidades, sintomas, diagnósticos`;

    const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extraia os dados deste caso:\n\n${transcription}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_case_data',
            description: 'Extrai dados estruturados',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                chief_complaint: { type: 'string' },
                notes: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
              required: ['title'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_case_data' } },
      }),
    });

    if (!extractionResponse.ok) {
      if (extractionResponse.status === 429) throw new Error('Muitas requisições. Aguarde alguns segundos.');
      if (extractionResponse.status === 402) throw new Error('Créditos esgotados.');
      throw new Error('Erro ao processar com IA');
    }

    const ed = await extractionResponse.json();
    const toolCall = ed.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error('IA não retornou dados estruturados');

    const caseData = JSON.parse(toolCall.function.arguments);
    if (!caseData.title) throw new Error('Título não identificado');

    return new Response(JSON.stringify({
      success: true,
      transcription,
      data: {
        title: caseData.title || '',
        chief_complaint: caseData.chief_complaint || '',
        notes: caseData.notes || '',
        tags: Array.isArray(caseData.tags) ? caseData.tags : [],
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro desconhecido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
