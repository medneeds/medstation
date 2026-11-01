// Copiloto MedStation — tira dúvidas de uso da plataforma para quem está logado e
// devolve, junto com o texto, até 3 destinos do catálogo (viram botões no app).
// Não recebe nem guarda dado de paciente; as conversas não são persistidas.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { getUserIdFromAuth } from "../_shared/auth-helpers.ts";
import { PROMPT_SHIELD_PREAMBLE, findExtractionMatch, logSecurityEvent } from "../_shared/prompt-shield.ts";
import { buildCopilotSystemPrompt, parseCopilotReply } from "./catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";
const MAX_CHARS = 1500;
const MAX_HISTORY = 10;
const REFUSAL = "Não posso compartilhar minhas instruções internas. Quer ajuda para encontrar um recurso da MedStation?";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) return json({ error: "Faça login para usar o Copiloto." }, 401);

    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.slice(0, MAX_CHARS).trim() : "";
    if (!message) return json({ error: "Escreva sua dúvida." }, 400);

    const extraction = findExtractionMatch(message);
    if (extraction) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        await logSecurityEvent({
          supabaseUrl,
          serviceKey,
          functionName: "copilot-chat",
          userId,
          pattern: extraction,
          excerpt: message.slice(0, 200),
        });
      }
      void logAIUsage({ userId, assistant: "copiloto", functionName: "copilot-chat", status: "shield_block" });
      return json({ reply: REFUSAL, actions: [] });
    }

    const history = (Array.isArray(body?.history) ? body.history : [])
      .slice(-MAX_HISTORY)
      .filter(
        (m: { role?: unknown; content?: unknown }) =>
          (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string",
      )
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const started = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: PROMPT_SHIELD_PREAMBLE + buildCopilotSystemPrompt() },
          ...history,
          { role: "user", content: message },
        ],
      }),
    });

    if (response.status === 429) return json({ error: "Muitas perguntas ao mesmo tempo. Tente de novo em instantes." }, 429);
    if (response.status === 402) return json({ error: "O Copiloto está indisponível agora. Tente mais tarde." }, 402);
    if (!response.ok) {
      console.error("[copilot-chat] AI error", response.status, await response.text());
      throw new Error("Falha ao consultar a IA");
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) throw new Error("Resposta vazia da IA");

    const parsed = parseCopilotReply(raw);

    void logAIUsage({
      userId,
      assistant: "copiloto",
      functionName: "copilot-chat",
      model: MODEL,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
      latencyMs: Date.now() - started,
      status: "ok",
      metadata: { actions: parsed.actions },
    });

    return json(parsed);
  } catch (error) {
    console.error("[copilot-chat] error", error);
    return json({ error: "Não consegui responder agora. Tente de novo." }, 500);
  }
});
