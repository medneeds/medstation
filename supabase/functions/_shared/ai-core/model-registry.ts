/**
 * MedStation AI Core — registry of model identifiers already in use.
 * Routing is kept separate from vendor transport: a model ID is not a URL.
 * Prices live in model-pricing.ts and must never be inferred from this registry.
 */
export type AIModelCapability = "text" | "vision" | "transcription";
export type AIModelTransport = "chat-completions" | "responses" | "audio-transcriptions" | "messages";

export interface AIModelDefinition {
  id: string;
  family: "openai" | "google" | "anthropic" | "elevenlabs";
  capabilities: readonly AIModelCapability[];
  transport: AIModelTransport;
  /** Gateway is the current production transport, not a permanent provider requirement. */
  legacyGateway: "lovable" | "direct" | "mixed";
}

export const AI_MODELS = {
  agentFast: {
    id: "google/gemini-3-flash-preview", family: "google", capabilities: ["text"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
  agentStrong: {
    id: "openai/gpt-6-astra", family: "openai", capabilities: ["text"],
    transport: "responses", legacyGateway: "lovable",
  },
  copilot: {
    id: "google/gemini-2.5-flash", family: "google", capabilities: ["text"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
  ocrPrimary: {
    id: "google/gemini-3.7-flash", family: "google", capabilities: ["text", "vision"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
  ocrFallback: {
    id: "google/gemini-3.1-pro-preview", family: "google", capabilities: ["text", "vision"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
  imaging: {
    id: "google/gemini-3.1-pro-preview", family: "google", capabilities: ["text", "vision"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
  transcriptionGateway: {
    id: "openai/gpt-transcribe", family: "openai", capabilities: ["transcription"],
    transport: "audio-transcriptions", legacyGateway: "lovable",
  },
  transcriptionDirect: {
    id: "openai/whisper-1", family: "openai", capabilities: ["transcription"],
    transport: "audio-transcriptions", legacyGateway: "direct",
  },
  transcriptionElevenLabs: {
    id: "elevenlabs/scribe_v2", family: "elevenlabs", capabilities: ["transcription"],
    transport: "audio-transcriptions", legacyGateway: "direct",
  },
  studioClaude: {
    id: "anthropic/claude-sonnet-5", family: "anthropic", capabilities: ["text"],
    transport: "messages", legacyGateway: "lovable",
  },
  studioGemini: {
    id: "google/gemini-3.5-flash", family: "google", capabilities: ["text"],
    transport: "chat-completions", legacyGateway: "lovable",
  },
} as const satisfies Record<string, AIModelDefinition>;

export function modelProviderFromId(id: string | null | undefined): AIModelDefinition["family"] | "unknown" {
  if (!id) return "unknown";
  const family = id.split("/")[0];
  return family === "openai" || family === "google" || family === "anthropic" || family === "elevenlabs"
    ? family : "unknown";
}

export function selectCoreModel(task: "clinical-fast" | "clinical-high-fidelity" | "copilot" | "ocr" | "imaging" | "transcription"): AIModelDefinition {
  switch (task) {
    case "clinical-fast": return AI_MODELS.agentFast;
    case "clinical-high-fidelity": return AI_MODELS.agentStrong;
    case "copilot": return AI_MODELS.copilot;
    case "ocr": return AI_MODELS.ocrPrimary;
    case "imaging": return AI_MODELS.imaging;
    case "transcription": return AI_MODELS.transcriptionGateway;
  }
}
