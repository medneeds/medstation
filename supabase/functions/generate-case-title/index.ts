import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await requirePlatformAccess(req);
    const { chief_complaint, notes } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const prompt = `Com base nas informações abaixo, gere um título conciso, claro e profissional para este caso clínico (máximo 60 caracteres):

${chief_complaint ? `Queixa Principal: ${chief_complaint}` : ''}
${notes ? `Observações: ${notes}` : ''}

Retorne apenas o título, sem aspas ou formatação adicional.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
      if (response.status === 429) throw new Error('Limite de requisições excedido. Aguarde alguns segundos.');
      if (response.status === 402) throw new Error('Créditos esgotados. Entre em contato com o suporte.');
      throw new Error('Erro ao gerar título');
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    if (error instanceof Error && error.message === 'ACCESS_REQUIRED') {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar título' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
