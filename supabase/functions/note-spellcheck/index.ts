import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateResponse, GatewayError, PaymentRequiredError, RateLimitError } from "npm:@lovable.dev/ai-gateway@0.1.11";
import { accessDeniedResponse, requirePlatformAccess } from "../_shared/access-control.ts";
import { checkSpellingOnly, MAX_SPELLCHECK_CHARS } from "./guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INSTRUCTIONS = `Você é um revisor de português do Brasil para textos médicos.
Corrija SOMENTE ortografia, acentuação e erros de digitação.
NÃO altere: números, doses, unidades, datas, horários, siglas e abreviações médicas (ex.: HAS, DM2, BEG, MV+, RCR 2T, PA, FC, SatO2), nomes de medicamentos, quebras de linha, títulos em maiúsculas, marcadores, ordem das frases ou o sentido clínico.
NÃO acrescente nem remova informações, não reescreva frases e não troque palavras corretas por sinônimos.
Devolva apenas o texto corrigido, sem comentários.`;

function outputText(resp: unknown): string {
  const r = resp as { output_text?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  if (typeof r.output_text === "string") return r.output_text;
  return (r.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text)
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requirePlatformAccess(req);
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text.trim()) return json({ error: "Texto vazio" }, 400);
    if (text.length > MAX_SPELLCHECK_CHARS) {
      return json({ error: `Selecione até ${MAX_SPELLCHECK_CHARS.toLocaleString("pt-BR")} caracteres por vez.` }, 400);
    }

    const resp = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      input: text,
    });
    const corrected = outputText(resp).replace(/^\n+/, "");
    // Keep the doctor's own trailing whitespace.
    const trailing = text.match(/\s*$/)?.[0] ?? "";
    const finalText = corrected.replace(/\s+$/, "") + trailing;

    const guard = checkSpellingOnly(text, finalText);
    if (!guard.ok) return json({ text, changed: false, rejected: guard.reason });
    return json({ text: finalText, changed: finalText !== text });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCESS_REQUIRED") {
      return accessDeniedResponse((error as Error & { access?: any }).access);
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return json({ error: "Não autorizado" }, 401);
    if (error instanceof RateLimitError) return json({ error: "Muitas correções seguidas. Aguarde alguns segundos." }, 429);
    if (error instanceof PaymentRequiredError) return json({ error: "Correção indisponível no momento." }, 402);
    if (error instanceof GatewayError) {
      console.error("note-spellcheck gateway", error.code, error.ids);
      return json({ error: "Não foi possível corrigir agora. Tente de novo." }, 502);
    }
    console.error("note-spellcheck", error);
    return json({ error: "Não foi possível corrigir agora. Tente de novo." }, 500);
  }
});
