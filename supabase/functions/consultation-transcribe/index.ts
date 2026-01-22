import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
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

    const { audio } = await req.json();

    if (!audio) {
      throw new Error('Dados de áudio não fornecidos');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('[CONSULTATION-TRANSCRIBE] OPENAI_API_KEY not found in environment');
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Log key format for debugging (only first/last chars)
    const keyPreview = openAIApiKey.length > 10 
      ? `${openAIApiKey.substring(0, 3)}...${openAIApiKey.substring(openAIApiKey.length - 4)}`
      : 'too short';
    console.log(`[CONSULTATION-TRANSCRIBE] Using OpenAI key: ${keyPreview}, length: ${openAIApiKey.length}`);

    console.log('[CONSULTATION-TRANSCRIBE] Processing audio chunk...');
    
    // Convert base64 to binary
    const binaryAudio = processBase64Chunks(audio);
    console.log(`[CONSULTATION-TRANSCRIBE] Audio size: ${binaryAudio.length} bytes`);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([binaryAudio.buffer as ArrayBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('prompt', `Transcrição de consulta médica em português brasileiro. 
Vocabulário médico comum: anamnese, queixa principal, história patológica pregressa, 
hipótese diagnóstica, conduta, prescrição, exame físico, ausculta, palpação, 
inspeção, percussão, sinais vitais, pressão arterial, frequência cardíaca, 
saturação, temperatura, glicemia, hemograma, radiografia, ultrassonografia, 
tomografia, ressonância magnética, eletrocardiograma.
Medicamentos comuns: omeprazol, losartana, metformina, sinvastatina, AAS, 
dipirona, paracetamol, ibuprofeno, amoxicilina, azitromicina.`);

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      throw new Error(`Erro na transcrição: ${whisperResponse.status}`);
    }

    const result = await whisperResponse.json();
    console.log('Transcription completed:', result.text?.substring(0, 50) + '...');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in consultation-transcribe:', error);
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
