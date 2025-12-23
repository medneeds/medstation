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
    const { topic, difficulty, questionCount, userLevel, specialty } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    const difficultyDescriptions: Record<string, string> = {
      easy: 'básico, ideal para revisão inicial',
      medium: 'intermediário, requer bom conhecimento',
      hard: 'avançado, questões complexas e detalhadas'
    };

    const levelDescriptions: Record<string, string> = {
      graduation: 'estudante de graduação em medicina',
      residency: 'residente de medicina',
      specialist: 'médico especialista'
    };

    const systemPrompt = `Você é um especialista em educação médica e criação de questões para provas de medicina.
Você deve gerar questões de múltipla escolha de alta qualidade, similares às encontradas em provas de residência médica no Brasil.

Regras importantes:
1. Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
2. Apenas uma alternativa deve estar correta
3. As alternativas incorretas devem ser plausíveis (distratores bem elaborados)
4. Inclua uma explicação detalhada para cada questão
5. O nível de dificuldade deve ser: ${difficultyDescriptions[difficulty] || 'intermediário'}
6. O usuário é ${levelDescriptions[userLevel] || 'estudante'}${specialty ? `, com interesse em ${specialty}` : ''}
7. Foque em casos clínicos quando apropriado
8. Use terminologia médica correta em português brasileiro

IMPORTANTE: Você DEVE usar a função generate_quiz_questions para retornar as questões.`;

    const userPrompt = `Gere ${questionCount || 10} questões de múltipla escolha sobre o tema: "${topic}".
    
O nível de dificuldade é: ${difficulty || 'medium'}.

As questões devem ser variadas e cobrir diferentes aspectos do tema.`;

    console.log(`Gerando ${questionCount} questões sobre ${topic} (${difficulty})`);

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
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz_questions",
              description: "Gera questões de múltipla escolha para quiz médico",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { 
                          type: "string",
                          description: "O enunciado completo da questão"
                        },
                        options: { 
                          type: "array",
                          items: { type: "string" },
                          description: "Array com as 5 alternativas (A, B, C, D, E)"
                        },
                        correct_answer: { 
                          type: "number",
                          description: "Índice da resposta correta (0-4)"
                        },
                        explanation: { 
                          type: "string",
                          description: "Explicação detalhada da resposta correta"
                        },
                        difficulty: { 
                          type: "string", 
                          enum: ["easy", "medium", "hard"],
                          description: "Nível de dificuldade da questão"
                        }
                      },
                      required: ["question_text", "options", "correct_answer", "explanation", "difficulty"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz_questions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos à sua conta.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da API:', JSON.stringify(data).substring(0, 500));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_quiz_questions') {
      throw new Error('Resposta da IA não contém as questões no formato esperado');
    }

    const questions = JSON.parse(toolCall.function.arguments);
    console.log(`Geradas ${questions.questions?.length || 0} questões com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      questions: questions.questions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao gerar quiz:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar quiz'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
