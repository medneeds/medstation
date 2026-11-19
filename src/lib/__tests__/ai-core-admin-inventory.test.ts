import { describe, expect, it } from "vitest";
import { AI_CORE_CAPABILITIES, AI_CORE_MODEL_ROUTES } from "@/lib/aiCoreInventory";

describe("AI Core admin inventory is safe and explicit", () => {
  it("does not treat deployed services or Hermes model inference as running", () => {
    expect(AI_CORE_CAPABILITIES.find(x => x.id === "hermes-live")?.stage).toBe("pending");
    expect(AI_CORE_CAPABILITIES.find(x => x.id === "clinical-execution")?.stage).toBe("pending");
    expect(AI_CORE_CAPABILITIES.find(x => x.id === "staging")?.stage).toBe("pending");
  });
  it("labels successful CI only as tests, not clinical release", () => {
    expect(AI_CORE_CAPABILITIES.find(x => x.id === "bridge")?.stage).toBe("tested");
    expect(AI_CORE_CAPABILITIES.find(x => x.id === "workflow")?.detail).toContain("simulada");
  });
  it("documents the original high-fidelity model without automatically changing routing", () => {
    expect(AI_CORE_MODEL_ROUTES.find(x => x.purpose.includes("Mediscuss"))?.model).toBe("openai/gpt-6-astra");
    expect(AI_CORE_MODEL_ROUTES.some(x => x.model === "google/gemini-3-flash-preview")).toBe(true);
  });
});
