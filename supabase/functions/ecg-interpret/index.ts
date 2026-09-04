// Clínicus — Interpretador de ECG (V1: eletrocardiograma).
// Motor multimodal isolado do agent-chat e do radiograph-interpret:
// a imagem ORIGINAL do traçado chega ao modelo via image_url (nunca OCR).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requirePlatformAccess, accessDeniedResponse, type AccessResolution } from "../_shared/access-control.ts";
import { logAIUsage, teeStreamWithUsage } from "../_shared/ai-logger.ts";
import {
  PROMPT_SHIELD_PREAMBLE,
  buildShieldRefusalSSE,
  findExtractionMatch,
  lastUserText,
  logSecurityEvent,
} from "../_shared/prompt-shield.ts";
import {
  ECG_BODY_REGION,
  ECG_MAX_TOKENS,
  ECG_MODALITY,
  ECG_MODE,
  ECG_MODEL,
  ECG_TEMPERATURE,
  MAX_ECG_IMAGE_BYTES,
  buildEcgMessages,
  buildEcgSystemPrompt,
  detectEcgOutputMode,
  ecgBytesToDataUrl,
  isEcgUuid,
  selectOwnedEcgEvidences,
  validateEcgEvidenceIds,
  validateEcgOutputMode,
  type EcgEvidenceRowLike,
} from "../_shared/ecg-interpreter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Ecg-Output-Mode",
};

const FUNCTION_NAME = "ecg-interpret";
const ASSISTANT = "clinicus";
const RATE_LIMIT = 30; // interpretações por hora por usuário
const WINDOW_MINUTES = 60;
const MAX_MESSAGES = 40;
const MAX_TEXT_CHARS = 10000;

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!supabaseUrl || !serviceKey) return json({ error: "Configuração do servidor incompleta" }, 500);
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);

  // 1) Autenticação + acesso à plataforma ANTES de qualquer custo de IA
  let userId: string;
  try {
    const resolved = await requirePlatformAccess(req);
    userId = resolved.user.id;
  } catch (e) {
    const err = e as Error & { access?: AccessResolution };
    if (err.message === "ACCESS_REQUIRED") return accessDeniedResponse(err.access);
    return json({ error: "Não autenticado" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 2) Rate limit (mesmo padrão do agent-chat, janela própria)
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
    const { data: rl } = await supabase
      .from("rate_limits")
      .select("id, request_count, window_start")
      .eq("user_id", userId)
      .eq("function_name", FUNCTION_NAME)
      .gte("window_start", windowStart.toISOString())
      .order("window_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rl && rl.request_count >= RATE_LIMIT) {
      const resetTime = new Date(new Date(rl.window_start).getTime() + WINDOW_MINUTES * 60 * 1000);
      return json(
        { error: "Limite de interpretações por hora atingido. Tente novamente mais tarde.", resetAt: resetTime.toISOString() },
        429,
        { "X-RateLimit-Limit": String(RATE_LIMIT), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": resetTime.toISOString() },
      );
    }
    if (rl) {
      await supabase.from("rate_limits").update({ request_count: rl.request_count + 1, updated_at: now.toISOString() }).eq("id", rl.id);
    } else {
      await supabase.from("rate_limits").insert({ user_id: userId, function_name: FUNCTION_NAME, request_count: 1, window_start: now.toISOString() });
    }
  } catch (e) {
    console.error("[ecg-interpret] rate limit error:", (e as Error).message);
  }

  // 3) Validação do payload
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido" }, 400);
  }

  const messages = Array.isArray(body.messages) ? (body.messages as Array<{ role?: string; content?: unknown }>) : null;
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return json({ error: "Histórico de mensagens inválido" }, 400);
  }
  for (const m of messages) {
    if (m?.role !== "user" && m?.role !== "assistant") return json({ error: "Papel de mensagem inválido" }, 400);
    if (typeof m.content !== "string") return json({ error: "Conteúdo de mensagem inválido" }, 400);
    if (m.content.length > MAX_TEXT_CHARS) return json({ error: `Mensagem excede ${MAX_TEXT_CHARS} caracteres` }, 400);
  }

  const idsResult = validateEcgEvidenceIds(body.evidenceIds);
  if (!idsResult.ok) return json({ error: idsResult.error }, idsResult.status);
  const evidenceIds = idsResult.value;

  const caseId = body.caseId == null ? null : isEcgUuid(body.caseId) ? body.caseId : undefined;
  if (caseId === undefined) return json({ error: "caseId inválido" }, 400);

  const requestedMode = validateEcgOutputMode(body.outputMode);
  const userText = lastUserText(messages);
  const outputMode = detectEcgOutputMode(userText, requestedMode);

  // 4) Prompt shield na última mensagem do usuário
  const extractionMatch = findExtractionMatch(userText);
  if (extractionMatch) {
    console.warn("[shield] ecg-interpret extraction attempt blocked");
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    void logSecurityEvent({
      supabaseUrl,
      serviceKey,
      functionName: FUNCTION_NAME,
      userId,
      ip,
      pattern: extractionMatch,
      excerpt: userText,
      metadata: { mode: ECG_MODE },
    });
    void logAIUsage({
      userId,
      assistant: ASSISTANT,
      functionName: FUNCTION_NAME,
      model: ECG_MODEL,
      status: "shield_block",
      latencyMs: Date.now() - startedAt,
      metadata: { mode: ECG_MODE, modality: ECG_MODALITY, body_region: ECG_BODY_REGION },
    });
    return new Response(buildShieldRefusalSSE(), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }

  // 5) Ownership das evidências (service role + checagem explícita de user_id)
  const { data: rows, error: rowsError } = await supabase
    .from("evidences")
    .select("id, user_id, type, file_path, file_size, title, is_active, metadata")
    .in("id", evidenceIds);

  if (rowsError) {
    console.error("[ecg-interpret] evidences query error:", rowsError.message);
    return json({ error: "Não foi possível localizar as imagens" }, 500);
  }

  const selection = selectOwnedEcgEvidences(evidenceIds, (rows ?? []) as EcgEvidenceRowLike[], userId);
  if (!selection.ok) return json({ error: selection.error }, selection.status);

  // 6) Download do bucket privado e conversão para data URL
  const imageDataUrls: string[] = [];
  let totalBytes = 0;
  for (const ev of selection.value) {
    const { data: blob, error: dlError } = await supabase.storage.from("evidences").download(ev.filePath);
    if (dlError || !blob) {
      console.error("[ecg-interpret] download error:", dlError?.message);
      return json({ error: "Não foi possível carregar uma das imagens" }, 500);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength === 0) return json({ error: "Uma das imagens está vazia" }, 400);
    if (bytes.byteLength > MAX_ECG_IMAGE_BYTES) return json({ error: "Imagem acima do limite de 10 MB" }, 400);
    totalBytes += bytes.byteLength;
    imageDataUrls.push(ecgBytesToDataUrl(bytes, ev.mime));
  }

  // 7) Montagem multimodal e chamada ao gateway (streaming)
  const systemPrompt = PROMPT_SHIELD_PREAMBLE + buildEcgSystemPrompt(outputMode);
  const gatewayMessages = buildEcgMessages({
    systemPrompt,
    history: messages,
    imageDataUrls,
    outputMode,
  });

  const logMetadata = {
    mode: ECG_MODE,
    modality: ECG_MODALITY,
    body_region: ECG_BODY_REGION,
    images_count: imageDataUrls.length,
    image_bytes_total: totalBytes,
    output_mode: outputMode,
    has_case: Boolean(caseId),
    streaming: true,
  };

  let upstream: Response;
  try {
    upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ECG_MODEL,
        messages: gatewayMessages,
        temperature: ECG_TEMPERATURE,
        max_tokens: ECG_MAX_TOKENS,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });
  } catch (e) {
    console.error("[ecg-interpret] gateway fetch failed:", (e as Error).message);
    void logAIUsage({ userId, assistant: ASSISTANT, functionName: FUNCTION_NAME, model: ECG_MODEL, status: "error", latencyMs: Date.now() - startedAt, metadata: { ...logMetadata, error: "fetch_failed" } });
    return json({ error: "Falha ao contatar o serviço de IA" }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => "");
    console.error("[ecg-interpret] gateway error:", upstream.status, errorText.slice(0, 500));
    void logAIUsage({ userId, assistant: ASSISTANT, functionName: FUNCTION_NAME, model: ECG_MODEL, status: "error", latencyMs: Date.now() - startedAt, metadata: { ...logMetadata, upstream_status: upstream.status } });

    if (upstream.status === 429) return json({ error: "Limite de requisições de IA excedido. Tente novamente em instantes." }, 429);
    if (upstream.status === 402) return json({ error: "Créditos de IA esgotados. Contate o suporte." }, 402);
    if (upstream.status === 400) return json({ error: "A imagem não pôde ser processada pelo modelo. Verifique o formato (JPEG, PNG ou WebP) e tente novamente." }, 400);
    return json({ error: "Erro do serviço de IA" }, 502);
  }

  const stream = teeStreamWithUsage(
    upstream.body,
    { userId, assistant: ASSISTANT, functionName: FUNCTION_NAME, model: ECG_MODEL, status: "ok", metadata: logMetadata },
    startedAt,
  );

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Ecg-Output-Mode": outputMode,
    },
  });
});
