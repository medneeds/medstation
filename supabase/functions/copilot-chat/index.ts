// Copiloto MedStation — guia da plataforma para quem está logado: tira dúvidas de uso,
// explica onde fica cada coisa e devolve, junto com o texto, até 3 destinos do catálogo
// (viram botões no app). Preços entram na hora a partir do calendário de preços.
// Não guarda as conversas; CPF, CNS, telefone e e-mail são retirados antes da IA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-logger.ts";
import { getUserIdFromAuth } from "../_shared/auth-helpers.ts";
import { findExtractionMatch, logSecurityEvent } from "../_shared/prompt-shield.ts";
import { BLACK_OFFER, FULL_PRICE_STARTS_AT, PRICE_TABLE, isBlackActive } from "../_shared/pricing-schedule.ts";
import {
  COPILOT_MAX_CHARS,
  buildCopilotPriceFacts,
  buildCopilotSystemPrompt,
  copilotPageFeature,
  isCopilotExtractionAttempt,
  parseCopilotReply,
  redactCopilotText,
  sanitizeCopilotHistory,
} from "./catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const AI_TIMEOUT_MS = 25_000;
/** Perguntas por usuário por hora — segura o custo de IA sem atrapalhar o uso normal. */
const RATE_LIMIT = 30;
const WINDOW_MINUTES = 60;
const REFUSAL = "Não posso compartilhar minhas instruções internas. Quer ajuda para encontrar um recurso da MedStation?";
const UNAVAILABLE = "O Copiloto está fora do ar agora. Enquanto isso, use os atalhos abaixo ou fale com o suporte.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callGateway(apiKey: string, messages: unknown[], jsonMode: boolean): Promise<Response> {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      // Pede JSON válido (quebras de linha escapadas), para os botões sempre funcionarem.
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não suportado." }, 405);

  let userId: string | null = null;
  try {
    userId = await getUserIdFromAuth(req);
    if (!userId) return json({ error: "Sua sessão expirou. Entre de novo para usar o Copiloto." }, 401);
    // Sem checar plano de propósito: dúvidas de uso ajudam também quem está com o teste
    // encerrado a entender o que a assinatura libera. O limite por hora segura o custo.

    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.slice(0, COPILOT_MAX_CHARS).trim() : "";
    if (!message) return json({ error: "Escreva sua dúvida." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      try {
        const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        const now = new Date();
        const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
        const { data: rl, error: rlError } = await db
          .from("rate_limits")
          .select("id, request_count, window_start")
          .eq("user_id", userId)
          .eq("function_name", "copilot-chat")
          .gte("window_start", windowStart.toISOString())
          .order("window_start", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rlError) console.error("[copilot-chat] rate limit check", rlError);
        if (rl && (rl.request_count ?? 0) >= RATE_LIMIT) {
          return json({ error: "Você fez muitas perguntas na última hora. Tente de novo daqui a pouco." }, 429);
        }
        if (rl) {
          await db
            .from("rate_limits")
            .update({ request_count: (rl.request_count ?? 0) + 1, updated_at: now.toISOString() })
            .eq("id", rl.id);
        } else {
          await db.from("rate_limits").insert({
            user_id: userId,
            function_name: "copilot-chat",
            request_count: 1,
            window_start: now.toISOString(),
          });
        }
      } catch (e) {
        // Limite é proteção de custo; falha nele não pode derrubar o guia.
        console.error("[copilot-chat] rate limit error", e);
      }
    }

    const shared = findExtractionMatch(message);
    if (isCopilotExtractionAttempt(message, shared)) {
      if (supabaseUrl && serviceKey) {
        await logSecurityEvent({
          supabaseUrl,
          serviceKey,
          functionName: "copilot-chat",
          userId,
          pattern: shared,
          excerpt: message.slice(0, 200),
        });
      }
      void logAIUsage({ userId, assistant: "copiloto", functionName: "copilot-chat", status: "shield_block" });
      return json({ reply: REFUSAL, actions: [] });
    }

    const nowMs = Date.now();
    const ctx = { blackActive: isBlackActive(nowMs) };
    const history = sanitizeCopilotHistory(body?.history, ctx);
    const page = copilotPageFeature(body?.page, ctx);
    const system = buildCopilotSystemPrompt({
      ...ctx,
      page,
      priceFacts: buildCopilotPriceFacts(
        { black: BLACK_OFFER, fullPriceStartsAt: FULL_PRICE_STARTS_AT, table: PRICE_TABLE },
        nowMs,
      ),
    });
    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: redactCopilotText(message) },
    ];

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("[copilot-chat] LOVABLE_API_KEY não configurada");
      return json({ error: UNAVAILABLE }, 503);
    }

    const started = Date.now();
    let response: Response;
    try {
      response = await callGateway(apiKey, messages, true);
      // Se o modelo/gateway recusar o modo JSON, tenta de novo sem ele: o parser aceita texto.
      if (response.status === 400) {
        console.error("[copilot-chat] gateway 400 com json_object", await response.text());
        response = await callGateway(apiKey, messages, false);
      }
    } catch (e) {
      console.error("[copilot-chat] gateway fetch", e);
      void logAIUsage({ userId, assistant: "copiloto", functionName: "copilot-chat", model: MODEL, status: "error" });
      return json({ error: "O Copiloto demorou para responder. Tente de novo em instantes." }, 504);
    }

    if (response.status === 429) return json({ error: "Muitas perguntas ao mesmo tempo. Tente de novo em instantes." }, 429);
    if (response.status === 402) {
      console.error("[copilot-chat] gateway 402 (créditos de IA esgotados)");
      return json({ error: UNAVAILABLE }, 503);
    }
    if (!response.ok) {
      console.error("[copilot-chat] AI error", response.status, await response.text());
      void logAIUsage({ userId, assistant: "copiloto", functionName: "copilot-chat", model: MODEL, status: "error" });
      return json({ error: "Não consegui responder agora. Tente de novo em instantes." }, 502);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) {
      console.error("[copilot-chat] resposta vazia", JSON.stringify(data).slice(0, 500));
      return json({ error: "Não consegui responder agora. Tente reformular a pergunta." }, 502);
    }

    const parsed = parseCopilotReply(raw, ctx);

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
      metadata: { actions: parsed.actions, page: page?.id ?? null },
    });

    return json(parsed);
  } catch (error) {
    console.error("[copilot-chat] error", error);
    return json({ error: "Não consegui responder agora. Tente de novo em instantes." }, 500);
  }
});
