import { describe, expect, it, vi } from "vitest";
import {
  buildCopilotChatRequest, callCopilotChat, copilotTransportModel, selectCopilotTransport,
} from "../../../supabase/functions/_shared/ai-core/chat-completions";

const messages = [
  { role: "system" as const, content: "Responda em JSON." },
  { role: "user" as const, content: "Onde encontro o Clínicus?" },
];

describe("AI Core Copilot provider integration (offline)", () => {
  it("does not switch provider just because direct credentials exist", () => {
    const config = selectCopilotTransport({ LOVABLE_API_KEY: "legacy-test-key", GEMINI_API_KEY: "direct-test-key", AI_CORE_COPILOT_DIRECT_MODEL: "gemini-2.5-flash" });
    expect(config.backend).toBe("lovable");
    expect(copilotTransportModel(config)).toBe("google/gemini-2.5-flash");
  });
  it("rejects invalid opt-ins and missing credentials without silent fallback", () => {
    expect(() => selectCopilotTransport({ AI_CORE_COPILOT_PROVIDER: "invalid", LOVABLE_API_KEY: "x" })).toThrow("Unsupported");
    expect(() => selectCopilotTransport({ AI_CORE_COPILOT_PROVIDER: "google", GEMINI_API_KEY: "x" })).toThrow("requires");
    expect(() => selectCopilotTransport({ AI_CORE_COPILOT_PROVIDER: "google", GEMINI_API_KEY: "x", AI_CORE_COPILOT_DIRECT_MODEL: "https://external.example.com" })).toThrow("Invalid");
  });
  it("constructs Google-compatible Chat Completions request with approved model alias", () => {
    const conf = selectCopilotTransport({ AI_CORE_COPILOT_PROVIDER: "google", GEMINI_API_KEY: "test-gemini-key", AI_CORE_COPILOT_DIRECT_MODEL: "gemini-2.5-flash" });
    const { endpoint, init } = buildCopilotChatRequest(conf, messages, true);
    expect(endpoint).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: "gemini-2.5-flash", response_format: { type: "json_object" }, messages });
    expect((init.headers as Record<string,string>).Authorization).toBe("Bearer test-gemini-key");
  });
  it("preserves legacy request shape when flag is absent", () => {
    const conf = selectCopilotTransport({ LOVABLE_API_KEY: "legacy-test-key" });
    const { endpoint, init } = buildCopilotChatRequest(conf, messages, false);
    expect(endpoint).toBe("https://ai.gateway.lovable.dev/v1/chat/completions");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "google/gemini-2.5-flash", messages });
    expect(JSON.parse(String(init.body))).not.toHaveProperty("response_format");
  });
  it("supports a mocked real HTTP invocation without contacting providers", async () => {
    const conf = selectCopilotTransport({ AI_CORE_COPILOT_PROVIDER: "google", GEMINI_API_KEY: "test-gemini-key", AI_CORE_COPILOT_DIRECT_MODEL: "gemini-2.5-flash" });
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"ok","actions":[]}' } }], usage: { prompt_tokens: 12, completion_tokens: 5 } }), { status: 200 }),
    );
    const response = await callCopilotChat(conf, messages, true, 1000, mockFetch as typeof fetch);
    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect((await response.json()).choices[0].message.content).toContain('"reply"');
  });
});
