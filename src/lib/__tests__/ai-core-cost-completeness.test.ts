import { describe, expect, it } from "vitest";
import { isUnpricedAICall } from "../../../supabase/functions/_shared/ai-core/cost-completeness";

describe("AI cost completeness", () => {
  it("marks historical Astra zero cost as unknown, not free", () => {
    expect(isUnpricedAICall({ model: "openai/gpt-6-astra", cost_usd: 0, metadata: null })).toBe(true);
  });
  it("marks modern null cost logs as unknown", () => {
    expect(isUnpricedAICall({ model: "openai/gpt-6-astra", cost_usd: null, metadata: { cost_estimate_missing: true } })).toBe(true);
    expect(isUnpricedAICall({ model: "google/gemini-3.1-pro-preview", cost_usd: null, metadata: null })).toBe(true);
  });
  it("retains correctly priced zero and nonzero usage", () => {
    expect(isUnpricedAICall({ model: "google/gemini-3-flash-preview", cost_usd: 0, metadata: { cost_estimate_missing: false } })).toBe(false);
    expect(isUnpricedAICall({ model: "openai/whisper-1", cost_usd: 0.05, metadata: null })).toBe(false);
  });
});
