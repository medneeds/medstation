import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  generateChatCompletion,
  generateMessage,
  generateResponse,
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
} from "npm:@lovable.dev/ai-gateway@0.1.11";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";
import { isStudioModel, MAX_STUDIO_CHARS, MAX_STUDIO_INSTRUCTIONS, MAX_STUDIO_MESSAGES, STUDIO_MODELS } from "./models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BASE = `Você é a IA do MedStation Studio, usada por médicos brasileiros. Responda em português do Brasil, de forma clara e direta.
Não invente dados clínicos, exames, doses ou referências. Se faltar informação, diga o que falta.
Não use títulos com # nem negrito/itálico com asteriscos; use títulos em MAIÚSCULAS, linhas em branco e marcadores.`;

type Msg = { role: "user" | "assistant"; content: string };

function responsesText(resp: unknown): string {
  const r = resp as { output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  if (typeof r.output_text === "string") return r.output_text;
  return (r.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string").map((c) => c.text).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requirePlatformAccess(req);
    const body = await req.json().catch(() => null);
    const model = body?.model;
    if (!isStudioModel(model)) return json({ error: "Modelo inválido" }, 400);
    const raw = Array.isArray(body?.messages) ? body.messages : [];
    const messages: Msg[] = raw
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim())
      .slice(-MAX_STUDIO_MESSAGES)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_STUDIO_CHARS * 2) }));
    if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Mensagem vazia" }, 400);
    if (messages[messages.length - 1].content.length > MAX_STUDIO_CHARS) return json({ error: "Mensagem muito longa" }, 400);
    const custom = typeof body?.instructions === "string" ? body.instructions.slice(0, MAX_STUDIO_INSTRUCTIONS).trim() : "";
    const system = custom ? `${BASE}\n\nINSTRUÇÕES DO ASSISTENTE PERSONALIZADO DO MÉDICO:\n${custom}` : BASE;

    const surface = STUDIO_MODELS.find((m) => m.id === model)!.surface;
    let text = "";
    if (model === "openai/gpt-6-astra") {
      const resp = await generateResponse({
        model,
        instructions: system,
        input: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      text = responsesText(resp);
    } else if (model === "anthropic/claude-sonnet-5") {
      const resp = await generateMessage({ model, system, max_tokens: 8000, messages });
      text = ((resp as any).content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
    } else {
      const resp = await generateChatCompletion({ model, messages: [{ role: "system", content: system }, ...messages] });
      const c = (resp as any).choices?.[0]?.message?.content;
      text = typeof c === "string" ? c : "";
    }
    if (!text.trim()) return json({ error: "A IA não devolveu resposta. Tente de novo." }, 502);
    return json({ text, model, surface });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return json({ error: "Não autorizado" }, 401);
    if (error instanceof RateLimitError) return json({ error: "Muitas mensagens seguidas. Aguarde alguns segundos." }, 429);
    if (error instanceof PaymentRequiredError) return json({ error: "Studio indisponível no momento." }, 402);
    if (error instanceof GatewayError) {
      console.error("studio-chat gateway", error.code, error.ids);
      return json({ error: "Não foi possível responder agora. Tente de novo." }, 502);
    }
    console.error("studio-chat", error);
    return json({ error: "Não foi possível responder agora. Tente de novo." }, 500);
  }
});
