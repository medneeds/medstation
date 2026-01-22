import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CONSULTATION-TRANSCRIBE] No authorization header');
      throw new Error('Não autorizado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[CONSULTATION-TRANSCRIBE] User auth failed:', userError);
      throw new Error('Usuário não autenticado');
    }

    console.log(`[CONSULTATION-TRANSCRIBE] User authenticated: ${user.id}`);

    const { audio, mimeType: clientMimeType } = await req.json();

    if (!audio) {
      throw new Error('Dados de áudio não fornecidos');
    }

    // Use OpenAI Whisper API for maximum transcription fidelity
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('[CONSULTATION-TRANSCRIBE] OPENAI_API_KEY not found');
      throw new Error('Serviço de transcrição não configurado');
    }

    console.log('[CONSULTATION-TRANSCRIBE] Processing audio with OpenAI Whisper...');
    console.log(`[CONSULTATION-TRANSCRIBE] Audio base64 length: ${audio.length}, mimeType: ${clientMimeType || 'not specified'}`);

    // Determine file extension based on MIME type
    const getFileExtension = (mime: string | undefined): string => {
      if (!mime) return 'webm';
      if (mime.includes('mp4') || mime.includes('m4a')) return 'mp4';
      if (mime.includes('ogg')) return 'ogg';
      if (mime.includes('wav')) return 'wav';
      if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
      if (mime.includes('webm')) return 'webm';
      return 'webm';
    };

    const fileExtension = getFileExtension(clientMimeType);
    const mimeType = clientMimeType || 'audio/webm';
    console.log(`[CONSULTATION-TRANSCRIBE] Using file extension: ${fileExtension}, MIME: ${mimeType}`);

    // Convert base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create a File object for the Whisper API
    const audioFile = new File([bytes], `audio.${fileExtension}`, { type: mimeType });

    // Prepare FormData for Whisper API
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese
    formData.append('response_format', 'json');
    // Medical vocabulary prompt to improve recognition accuracy
    formData.append('prompt', 
      'Transcrição de consulta médica em português brasileiro. ' +
      'Termos comuns: anamnese, queixa principal, história patológica pregressa, hipótese diagnóstica, ' +
      'exame físico, ausculta, palpação, inspeção, percussão, ' +
      'pressão arterial, frequência cardíaca, saturação, temperatura, ' +
      'hemograma, glicemia, colesterol, creatinina, ureia, TGO, TGP, ' +
      'omeprazol, losartana, metformina, sinvastatina, dipirona, paracetamol, ' +
      'amoxicilina, azitromicina, prednisona, hidroclorotiazida, atenolol.'
    );

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[CONSULTATION-TRANSCRIBE] Whisper API error:', whisperResponse.status, errorText);
      
      // Handle specific error cases
      if (whisperResponse.status === 401) {
        throw new Error('Chave de API inválida');
      }
      if (whisperResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns segundos.');
      }
      
      throw new Error(`Erro na transcrição: ${whisperResponse.status}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcription = whisperResult.text?.trim() || '';

    const processingTime = Date.now() - startTime;
    console.log(`[CONSULTATION-TRANSCRIBE] Transcription complete in ${processingTime}ms`);
    console.log(`[CONSULTATION-TRANSCRIBE] Result: "${transcription.substring(0, 150)}${transcription.length > 150 ? '...' : ''}"`);

    return new Response(
      JSON.stringify({ 
        text: transcription,
        processingTime,
        model: 'whisper-1'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[CONSULTATION-TRANSCRIBE] Error:', error);
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
