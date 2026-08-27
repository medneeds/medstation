import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { estimateAudioSecondsFromBytes } from "../_shared/auth-helpers.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[CONSULTATION-TRANSCRIBE] Function started - Using OpenAI Whisper');

  try {
    const { user } = await requirePlatformAccess(req);
    console.log(`[CONSULTATION-TRANSCRIBE] User authorized: ${user.id}`);

    const { audio, mimeType: clientMimeType } = await req.json();
    if (!audio) throw new Error('Dados de áudio não fornecidos');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[CONSULTATION-TRANSCRIBE] OPENAI_API_KEY not found');
      throw new Error('Serviço de transcrição não configurado');
    }

    console.log('[CONSULTATION-TRANSCRIBE] Processing audio with OpenAI Whisper...');
    console.log(`[CONSULTATION-TRANSCRIBE] Audio base64 length: ${audio.length}, mimeType: ${clientMimeType || 'not specified'}`);

    const getFileInfo = (mime: string | undefined): { extension: string; cleanMime: string } => {
      if (!mime) return { extension: 'webm', cleanMime: 'audio/webm' };
      const lowerMime = mime.toLowerCase();
      if (lowerMime.includes('mp4') || lowerMime.includes('m4a')) return { extension: 'mp4', cleanMime: 'audio/mp4' };
      if (lowerMime.includes('ogg') || lowerMime.includes('oga')) return { extension: 'ogg', cleanMime: 'audio/ogg' };
      if (lowerMime.includes('wav')) return { extension: 'wav', cleanMime: 'audio/wav' };
      if (lowerMime.includes('mpeg') || lowerMime.includes('mp3') || lowerMime.includes('mpga')) return { extension: 'mp3', cleanMime: 'audio/mpeg' };
      if (lowerMime.includes('flac')) return { extension: 'flac', cleanMime: 'audio/flac' };
      return { extension: 'webm', cleanMime: 'audio/webm' };
    };

    const { extension: fileExtension, cleanMime: mimeType } = getFileInfo(clientMimeType);
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const audioSeconds = estimateAudioSecondsFromBytes(bytes.byteLength);

    const audioFile = new File([bytes], `audio.${fileExtension}`, { type: mimeType });
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');
    formData.append('prompt',
      'Transcrição fiel de consulta médica em português brasileiro. ' +
      'REGRA: transcreva APENAS o que foi dito. Se houver silêncio, não invente texto. ' +
      'Termos médicos comuns: anamnese, queixa principal, história patológica pregressa, ' +
      'hipótese diagnóstica, exame físico, ausculta, palpação, inspeção, percussão, ' +
      'pressão arterial, frequência cardíaca, saturação, temperatura, hemograma, ' +
      'glicemia, colesterol, creatinina, ureia, TGO, TGP, omeprazol, losartana, ' +
      'metformina, sinvastatina, dipirona, paracetamol, amoxicilina, azitromicina.'
    );

    const sttStart = Date.now();
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}` },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[CONSULTATION-TRANSCRIBE] Whisper API error:', whisperResponse.status, errorText);
      void logAIUsage({
        userId: user.id, assistant: 'consultorio', functionName: 'consultation-transcribe',
        model: 'openai/whisper-1', audioSeconds, latencyMs: Date.now() - sttStart, status: 'error',
      });
      if (whisperResponse.status === 401) throw new Error('Chave de API inválida');
      if (whisperResponse.status === 429) throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      throw new Error(`Erro na transcrição: ${whisperResponse.status}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcription = whisperResult.text?.trim() || '';
    void logAIUsage({
      userId: user.id, assistant: 'consultorio', functionName: 'consultation-transcribe',
      model: 'openai/whisper-1', audioSeconds, latencyMs: Date.now() - sttStart, status: 'ok',
    });

    const noSpeechProb = whisperResult.segments?.[0]?.no_speech_prob ?? 0;
    if (noSpeechProb > 0.7) {
      return new Response(
        JSON.stringify({ text: '', processingTime: Date.now() - startTime, model: 'whisper-1', noSpeechProb }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processingTime = Date.now() - startTime;
    return new Response(
      JSON.stringify({ text: transcription, processingTime, model: 'whisper-1' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'ACCESS_REQUIRED') {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[CONSULTATION-TRANSCRIBE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
