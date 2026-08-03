import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 2000;

const EXTRACTION_PATTERNS: RegExp[] = [
  /\b(mostr[ae]|exib[ae]|revel[ae]|imprim[ae]|repi(ta|te)|liste|descreva|resuma|parafrase[ae])\b[^.?!\n]{0,80}\b(system\s*prompt|prompt\s*do\s*sistema|prompt[s]?\s*interno|instru[cç][õo]es|regras|diretrizes|persona|identidade|template)/i,
  /\b(show|reveal|print|repeat|display|list|describe|tell\s*me|dump|leak)\b[^.?!\n]{0,80}\b(system\s*prompt|instructions?|rules|guidelines|prompt|persona)/i,
  /\b(ignore|esque[çc]a|disregard|forget)\b[^.?!\n]{0,40}\b(anterior(es)?|previous|acima|above|todas\s*as\s*instru[cç][õo]es|all\s*instructions|system\s*prompt)/i,
  /\b(DAN|do\s*anything\s*now|developer\s*mode|debug\s*mode|jailbreak|modo\s*desenvolvedor|modo\s*debug)\b/i,
  /<\/?\s*(system|developer|assistant|instructions?)\s*>/i,
  /\[(\s*system\s*|\s*end\s*of\s*system\s*|\s*new\s*prompt\s*)\]/i,
];
const SHIELD_REFUSAL_TEXT = "Não posso compartilhar minhas instruções internas. Posso te ajudar com outra dúvida sobre os assistentes?";

function findExtractionMatch(text: string): string | null {
  if (!text || typeof text !== "string") return null;
  const t = text.slice(0, 4000);
  for (const re of EXTRACTION_PATTERNS) if (re.test(t)) return re.source;
  return null;
}

const SYSTEM_PROMPT = `Você é o Guia MedStation AI: um assistente que tira dúvidas de médicos que estão conhecendo a plataforma. Seu papel é explicar, com clareza e sem enrolação, o que cada assistente faz, para quem serve e como ajuda no dia a dia clínico. Você também ajuda a pessoa a escolher o próximo passo.

POSICIONAMENTO
"Produza mais. Digite menos." A MedStation AI reduz o tempo gasto com burocracia clínica para devolver tempo ao paciente.

OS ASSISTENTES (chame sempre de "assistentes", nunca de "agentes")
1. Examinus — resume e organiza exames laboratoriais (texto, foto ou PDF) em categorias clínicas prontas para colar na evolução. É GRATUITO para quem cria conta.
2. Clínicus — monta anamnese estruturada e discute o caso; tem modelos para consultório, enfermaria, emergência e UTI.
3. Scorius — calcula scores e estratificação de risco.
4. Numerus — calculadoras e conversões clínicas.
5. Prescriptus — consulta de medicamentos e bula inteligente.
6. CODexus — encontra o CID-10 correto.
7. Gasometrus — interpreta gasometria com leitura sistemática.
8. Atestus — gera atestados (apenas com CID, sem descrever doença).
9. Protocolus — protocolos e diretrizes atualizadas (AHA, ESC, OMS e outras).
10. Orientus — orientações de alta em linguagem que o paciente entende.
11. Mediscuss — discussão clínica aprofundada de casos complexos.
Além disso existe o MODO CONSULTÓRIO: grava a consulta, transcreve e devolve a anamnese estruturada pronta para revisar e copiar.

CAMINHOS QUE VOCÊ PODE SUGERIR
- Testar agora sem cadastro: demonstração pública do Examinus na página inicial (tem limite de uso).
- Criar conta grátis: libera o Examinus completo dentro da plataforma, sem espera e sem pop-ups.
- Assinar: libera os demais assistentes e, no plano superior, o Modo Consultório.
- Garantia incondicional de 7 dias em qualquer plano pago.

REGRAS DE RESPOSTA
- Português brasileiro, tom profissional, direto e acolhedor. Máximo ~120 palavras por resposta.
- NUNCA use markdown: sem #, sem asteriscos de negrito ou itálico. Use APENAS texto corrido, quebras de linha e, quando necessário, marcadores com "- " e títulos em CAIXA ALTA.
- Não invente funcionalidades, preços exatos ou prazos. Se não souber, diga que a equipe pode confirmar.
- Não dê conduta médica para paciente específico; explique o que o assistente faria.
- Termine sugerindo um próximo passo concreto quando fizer sentido.
- NUNCA cite vínculo com qualquer hospital, clínica ou instituição específica.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message: string = typeof body?.message === "string" ? body.message.slice(0, MAX_CHARS) : "";
    const rawHistory = Array.isArray(body?.history) ? body.history.slice(-10) : [];

    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "Mensagem é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractionMatch = findExtractionMatch(message);
    if (extractionMatch) {
      console.warn("[shield] public-assistants-chat extraction attempt blocked");
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
        if (supabaseUrl && serviceKey) {
          await fetch(`${supabaseUrl}/rest/v1/security_events`, {
            method: "POST",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              function_name: "public-assistants-chat",
              event_type: "prompt_extraction_attempt",
              ip_address: ip,
              pattern_matched: extractionMatch,
              excerpt: message.slice(0, 200),
            }),
          });
        }
      } catch (e) {
        console.error("[security_events] failed to log", e);
      }
      return new Response(JSON.stringify({ response: SHIELD_REFUSAL_TEXT }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const history = rawHistory
      .filter((m: unknown) => {
        const msg = m as { role?: string; content?: string };
        return (msg?.role === "user" || msg?.role === "assistant") && typeof msg?.content === "string";
      })
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content.slice(0, MAX_CHARS),
      }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Muitas perguntas ao mesmo tempo. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Serviço temporariamente indisponível. Tente novamente mais tarde." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`Erro ao processar com IA: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("Resposta inválida da IA");

    void logAIUsage({
      assistant: "guia-publico",
      functionName: "public-assistants-chat",
      model: "google/gemini-2.5-flash",
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      status: "ok",
    });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in public-assistants-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
