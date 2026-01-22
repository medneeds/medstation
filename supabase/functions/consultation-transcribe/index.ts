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
  console.log('[CONSULTATION-TRANSCRIBE] Function started');

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

    // Use Lovable AI Gateway - no external API key needed!
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('[CONSULTATION-TRANSCRIBE] LOVABLE_API_KEY not found');
      throw new Error('Serviço de IA não configurado');
    }

    console.log('[CONSULTATION-TRANSCRIBE] Processing audio with Lovable AI (Gemini)...');
    console.log(`[CONSULTATION-TRANSCRIBE] Audio base64 length: ${audio.length}, mimeType: ${clientMimeType || 'not specified'}`);

    // Determine MIME type
    const getMimeType = (mime: string | undefined): string => {
      if (!mime) return 'audio/webm';
      if (mime.includes('mp4') || mime.includes('m4a')) return 'audio/mp4';
      if (mime.includes('ogg')) return 'audio/ogg';
      if (mime.includes('wav')) return 'audio/wav';
      if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio/mpeg';
      return 'audio/webm';
    };

    const audioMimeType = getMimeType(clientMimeType);
    console.log(`[CONSULTATION-TRANSCRIBE] Using MIME type: ${audioMimeType}`);

    // Build data URL for Gemini multimodal input
    const audioDataUrl = `data:${audioMimeType};base64,${audio}`;

    // Use Gemini for audio transcription via Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico especializado em transcrever áudios de consultas médicas em português brasileiro.

INSTRUÇÕES CRÍTICAS:
1. Transcreva o áudio EXATAMENTE como foi falado, sem adicionar ou remover palavras
2. Preserve todos os termos médicos e técnicos com precisão
3. Mantenha nomes de medicamentos, dosagens e valores exatos
4. Se houver múltiplos falantes, indique com [Médico:] ou [Paciente:] quando possível identificar
5. Use pontuação adequada para refletir pausas e entonações
6. NÃO adicione interpretações, resumos ou comentários
7. Se o áudio estiver inaudível/silêncio, retorne string vazia.

Vocabulário médico comum que pode aparecer:
- Anamnese, queixa principal, história patológica pregressa, hipótese diagnóstica
- Exame físico: ausculta, palpação, inspeção, percussão
- Sinais vitais: pressão arterial, frequência cardíaca, saturação, temperatura
- Exames: hemograma, glicemia, colesterol, creatinina, ureia, TGO, TGP
- Medicamentos: omeprazol, losartana, metformina, sinvastatina, dipirona, paracetamol`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva o áudio a seguir com precisão médica. Retorne APENAS a transcrição (ou vazio se não der para entender):'
              },
              {
                type: 'audio_url',
                audio_url: {
                  url: audioDataUrl
                }
              }
            ]
          }
        ],
        temperature: 0, // minimize hallucinations
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[CONSULTATION-TRANSCRIBE] Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Erro na transcrição: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const transcription = aiResult.choices?.[0]?.message?.content?.trim() || '';

    const processingTime = Date.now() - startTime;
    console.log(`[CONSULTATION-TRANSCRIBE] Transcription complete in ${processingTime}ms`);
    console.log(`[CONSULTATION-TRANSCRIBE] Result preview: ${transcription.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({ 
        text: transcription,
        processingTime 
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
