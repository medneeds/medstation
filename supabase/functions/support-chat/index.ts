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
    const { message } = await req.json();
    
    if (!message) {
      throw new Error('Mensagem é obrigatória');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um assistente de suporte inteligente do MedPocket, uma plataforma médica completa.

FUNCIONALIDADES DO SISTEMA:

1. **Dashboard**: Visão geral com estatísticas de pacientes, atendimentos recentes e resumo de informações importantes.

2. **Pacientes**: 
   - Cadastro completo de pacientes com foto
   - Busca e filtros avançados
   - Visualização de histórico completo
   - Dados demográficos e informações de contato

3. **Casos Clínicos**:
   - Registro de atendimentos e consultas
   - Anexo de imagens e documentos
   - Histórico evolutivo
   - Tags para organização
   - Busca por paciente ou condição

4. **Notas Médicas**:
   - Anotações rápidas sobre pacientes
   - Categorização por tags
   - Sistema de busca eficiente
   - Anexo de evidências

5. **Prescrições (Prescriptus)**:
   - Criação de receitas médicas
   - Gravação por voz para transcrição automática
   - Banco de medicamentos
   - Histórico de prescrições por paciente
   - Exportação em PDF

6. **Solicitações de Exames**:
   - Criação de pedidos de exames
   - Templates personalizados
   - Múltiplos exames por solicitação
   - Exportação em PDF

7. **Documentos Médicos**:
   - Geração de laudos, relatórios e atestados
   - Alimentado por IA para agilizar
   - Busca por paciente
   - Exportação em PDF

8. **Agentes de IA Premium**:
   - **Clínicus**: Relatórios e análises clínicas
   - **Examinus**: Interpretação de exames laboratoriais
   - **Scorius**: Cálculo de scores clínicos
   - **Numerus**: Cálculos clínicos e conversões
   - **CODexus**: Busca de códigos CID-10 e LOINC
   - **Prescriptus**: Auxílio em prescrições

INSTRUÇÕES:
- Seja objetivo e claro nas explicações
- Use exemplos práticos quando necessário
- Indique onde o usuário pode encontrar cada funcionalidade no menu
- Se houver dúvidas técnicas, oriente passo a passo
- Seja empático e profissional
- Responda em português brasileiro`;

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
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Erro ao processar com IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Resposta inválida da IA');
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in support-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});