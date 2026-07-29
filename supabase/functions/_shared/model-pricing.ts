// Preços aproximados por 1M tokens (USD) para modelos de texto,
// e por minuto (USD) para modelos de fala. Ajuste conforme provider.
// Fonte: gateway Lovable AI + OpenAI/ElevenLabs públicos (atualizar quando mudar).

export type Provider = "lovable_ai" | "openai" | "elevenlabs" | "unknown";

export interface ModelPrice {
  input: number;      // USD por 1M tokens de entrada  (chat/embed)
  output: number;     // USD por 1M tokens de saída    (chat)
  perMinute?: number; // USD por minuto de áudio       (STT)
  provider: Provider;
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Google Gemini via Lovable Gateway
  "google/gemini-3.6-flash":         { input: 0.075, output: 0.30, provider: "lovable_ai" },
  "google/gemini-3-flash-preview":   { input: 0.075, output: 0.30, provider: "lovable_ai" },
  "google/gemini-2.5-flash":         { input: 0.075, output: 0.30, provider: "lovable_ai" },
  "google/gemini-2.5-flash-lite":    { input: 0.04,  output: 0.15, provider: "lovable_ai" },
  "google/gemini-2.5-pro":           { input: 1.25,  output: 5.0,  provider: "lovable_ai" },
  // OpenAI via Lovable Gateway (texto)
  "openai/gpt-5-nano":               { input: 0.05,  output: 0.40, provider: "lovable_ai" },
  "openai/gpt-5-mini":               { input: 0.25,  output: 2.0,  provider: "lovable_ai" },
  "openai/gpt-5":                    { input: 1.25,  output: 10.0, provider: "lovable_ai" },
  // OpenAI direto (STT — cobrado por minuto)
  "openai/whisper-1":                { input: 0, output: 0, perMinute: 0.006, provider: "openai" },
  // ElevenLabs direto (STT — cobrado por minuto; ~US$0.40/hora do Scribe v2)
  "elevenlabs/scribe_v2":            { input: 0, output: 0, perMinute: 0.0067, provider: "elevenlabs" },
  "elevenlabs/scribe_v2_realtime":   { input: 0, output: 0, perMinute: 0.0083, provider: "elevenlabs" },
  // Fallback
  "unknown":                         { input: 0, output: 0, provider: "unknown" },
};

/** Custo de chamada de texto (tokens). */
export function estimateCostUSD(
  model: string | null | undefined,
  input: number,
  output: number,
): number {
  const p = (model && MODEL_PRICING[model]) || MODEL_PRICING["unknown"];
  return ((input || 0) * p.input + (output || 0) * p.output) / 1_000_000;
}

/** Custo de STT (por minuto de áudio). */
export function estimateSTTCostUSD(
  model: string | null | undefined,
  seconds: number,
): number {
  const p = (model && MODEL_PRICING[model]) || MODEL_PRICING["unknown"];
  const perMin = p.perMinute ?? 0;
  return (Math.max(0, seconds) / 60) * perMin;
}

/** Deriva o provider a partir do id do modelo quando não informado explicitamente. */
export function providerFromModel(model: string | null | undefined): Provider {
  if (!model) return "unknown";
  if (MODEL_PRICING[model]) return MODEL_PRICING[model].provider;
  if (model.startsWith("openai/whisper")) return "openai";
  if (model.startsWith("elevenlabs/")) return "elevenlabs";
  if (model.startsWith("openai/") || model.startsWith("google/") || model.startsWith("anthropic/")) {
    return "lovable_ai";
  }
  return "unknown";
}
