/**
 * Backend-only, opt-in Chat Completions transport for low-risk workloads.
 * No clinical agent uses this adapter until separately reviewed.
 * Google's OpenAI-compatible endpoint preserves the response shape used by Copilot.
 *
 * No automatic cross-provider fallback: retries could duplicate paid requests.
 */
import { resolveModelTransport } from "./provider-transport.ts";

export type CopilotTransportConfig =
  | { backend: "lovable"; apiKey: string }
  | { backend: "google"; apiKey: string; directModelId: string };

export type ChatMessage = { role: string; content: string };
export const COPILOT_ENDPOINTS = Object.freeze({
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
});

export function selectCopilotTransport(env: {
  AI_CORE_COPILOT_PROVIDER?: string;
  AI_CORE_COPILOT_DIRECT_MODEL?: string;
  LOVABLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
}): CopilotTransportConfig {
  // Default must stay Lovable even when Google credentials are present.
  if (env.AI_CORE_COPILOT_PROVIDER !== "google") {
    if (env.AI_CORE_COPILOT_PROVIDER && env.AI_CORE_COPILOT_PROVIDER !== "lovable") {
      throw new Error("Unsupported Copilot provider");
    }
    if (!env.LOVABLE_API_KEY) throw new Error("Lovable AI not configured");
    return { backend: "lovable", apiKey: env.LOVABLE_API_KEY };
  }
  if (!env.GEMINI_API_KEY || !env.AI_CORE_COPILOT_DIRECT_MODEL?.trim()) {
    throw new Error("Direct Gemini requires API key and approved model alias");
  }
  // Validate aliases as model IDs, not URLs or arbitrary user input.
  if (!/^[a-zA-Z0-9._-]{3,100}$/.test(env.AI_CORE_COPILOT_DIRECT_MODEL)) {
    throw new Error("Invalid Gemini model alias");
  }
  return {
    backend: "google",
    apiKey: env.GEMINI_API_KEY,
    directModelId: env.AI_CORE_COPILOT_DIRECT_MODEL,
  };
}

export function copilotTransportModel(config: CopilotTransportConfig): string {
  return config.backend === "lovable" ? "google/gemini-2.5-flash" : "google/" + config.directModelId;
}

export function buildCopilotChatRequest(
  config: CopilotTransportConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
): { endpoint: string; init: RequestInit } {
  const route = resolveModelTransport({
    model: "google/gemini-2.5-flash",
    currentGateway: config.backend === "google" ? "direct" : "lovable",
    directProvider: config.backend === "google" ? "google" : undefined,
    directModelId: config.backend === "google" ? config.directModelId : undefined,
    endpoints: COPILOT_ENDPOINTS,
  });
  return {
    endpoint: route.endpoint,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: route.model,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
    },
  };
}

export async function callCopilotChat(
  config: CopilotTransportConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
  timeoutMs: number,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const { endpoint, init } = buildCopilotChatRequest(config, messages, jsonMode);
  return await fetcher(endpoint, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
