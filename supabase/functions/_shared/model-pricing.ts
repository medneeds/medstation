// Preços aproximados por 1M tokens (USD). Ajuste conforme provider.
// Fonte: gateway Lovable AI + OpenAI/Whisper públicos (atualizar quando mudar).
export interface ModelPrice {
  input: number;   // USD por 1M tokens de entrada
  output: number;  // USD por 1M tokens de saída
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  // Google Gemini via Lovable Gateway
  "google/gemini-3-flash-preview": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.0 },
  // OpenAI
  "openai/gpt-5-mini": { input: 0.25, output: 2.0 },
  "openai/gpt-5": { input: 1.25, output: 10.0 },
  "openai/whisper-1": { input: 6.0, output: 0 }, // $0.006/min ~ trate como bruto
  // Fallback
  "unknown": { input: 0, output: 0 },
};

export function estimateCostUSD(model: string | null | undefined, input: number, output: number): number {
  const p = (model && MODEL_PRICING[model]) || MODEL_PRICING["unknown"];
  return ((input || 0) * p.input + (output || 0) * p.output) / 1_000_000;
}
