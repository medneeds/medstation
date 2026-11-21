/**
 * Backend-only transport selector. Does not send data to a model.
 * Fail closed: direct providers require explicitly configured endpoints.
 * No secret keys, endpoints, or patient data should be imported by the frontend.
 */
export type AIBackend = "lovable" | "openai" | "google" | "anthropic";
export interface ProviderEndpoints {
  lovable?: string;
  openai?: string;
  google?: string;
  anthropic?: string;
}

export interface ModelTransportDecision {
  backend: AIBackend;
  endpoint: string;
  model: string;
}

/** Provider-specific model aliases must be configured; gateway identifiers are not universal. */
export function resolveModelTransport(input: {
  model: string;
  currentGateway: "lovable" | "direct";
  directProvider?: Exclude<AIBackend, "lovable">;
  directModelId?: string;
  endpoints: ProviderEndpoints;
}): ModelTransportDecision {
  const backend: AIBackend = input.currentGateway === "lovable" ? "lovable" : input.directProvider ?? "lovable";
  if (input.currentGateway === "direct" && !input.directProvider) {
    throw new Error("Direct provider not configured");
  }
  const raw = input.endpoints[backend]?.trim();
  if (!raw || !/^https:\/\//i.test(raw)) throw new Error(`Secure endpoint not configured for ${backend}`);
  if (input.currentGateway === "direct" && !input.directModelId?.trim()) {
    throw new Error("Explicit direct model identifier required");
  }
  return {
    backend,
    endpoint: raw,
    model: backend === "lovable" ? input.model : input.directModelId!,
  };
}
