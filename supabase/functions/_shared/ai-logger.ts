// Logger central para uso de IA — grava em ai_usage_logs via service_role.
// Não deve lançar erros que quebrem a resposta ao usuário.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  estimateCostUSD,
  estimateSTTCostUSD,
  providerFromModel,
  type Provider,
} from "./model-pricing.ts";

export interface LogUsageParams {
  userId?: string | null;
  assistant?: string | null;
  functionName: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  status?: string; // ok | error | shield_block
  metadata?: Record<string, unknown> | null;
  /** Provider explícito. Se ausente, derivado do model. */
  provider?: Provider;
  /** Segundos de áudio (para STT). Se presente, custo derivado por minuto. */
  audioSeconds?: number | null;
  /** Custo já calculado externamente — sobrepõe os estimadores. */
  costUsdOverride?: number | null;
}

function client() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logAIUsage(p: LogUsageParams): Promise<void> {
  try {
    const supabase = client();
    if (!supabase) return;

    const input = p.inputTokens ?? 0;
    const output = p.outputTokens ?? 0;
    const total = p.totalTokens ?? input + output;
    const provider = p.provider ?? providerFromModel(p.model);
    const audioSeconds = p.audioSeconds ?? null;

    let cost: number;
    if (p.costUsdOverride != null) {
      cost = p.costUsdOverride;
    } else if (audioSeconds != null && audioSeconds > 0) {
      cost = estimateSTTCostUSD(p.model, audioSeconds);
    } else {
      cost = estimateCostUSD(p.model, input, output);
    }

    const metadata: Record<string, unknown> = {
      ...(p.metadata ?? {}),
      provider,
      ...(audioSeconds != null ? { audio_seconds: audioSeconds } : {}),
    };

    await supabase.from("ai_usage_logs").insert({
      user_id: p.userId ?? null,
      assistant: p.assistant ?? null,
      function_name: p.functionName,
      model: p.model ?? null,
      input_tokens: input,
      output_tokens: output,
      total_tokens: total,
      cost_usd: cost,
      latency_ms: p.latencyMs ?? null,
      status: p.status ?? "ok",
      metadata,
    });
  } catch (e) {
    console.error("[ai-logger] failed:", (e as Error).message);
  }
}

/**
 * Encapsula um ReadableStream SSE do gateway Lovable/OpenAI para:
 *  - repassar todos os chunks ao cliente sem alteração
 *  - capturar o objeto `usage` (se presente) do último chunk
 *  - logar automaticamente ao encerrar
 */
export function teeStreamWithUsage(
  upstream: ReadableStream<Uint8Array>,
  logParams: Omit<LogUsageParams, "inputTokens" | "outputTokens" | "totalTokens" | "latencyMs">,
  startedAt: number,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const payload = l.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              if (j.usage) usage = j.usage;
            } catch { /* ignore parse */ }
          }
        }
      } catch (e) {
        console.error("[teeStreamWithUsage] read error:", (e as Error).message);
      } finally {
        controller.close();
        const latency = Date.now() - startedAt;
        void logAIUsage({
          ...logParams,
          inputTokens: usage?.prompt_tokens ?? 0,
          outputTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
          latencyMs: latency,
        });
      }
    },
  });
}
