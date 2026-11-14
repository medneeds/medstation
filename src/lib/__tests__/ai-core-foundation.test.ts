import { describe, expect, it } from "vitest";
import { AI_MODELS, modelProviderFromId, selectCoreModel } from "../../../supabase/functions/_shared/ai-core/model-registry";
import { authorizeClinicalTool, CLINICAL_TOOLS } from "../../../supabase/functions/_shared/ai-core/clinical-tool-contract";
import { estimateKnownCostUSD, estimateKnownSTTCostUSD } from "../../../supabase/functions/_shared/model-pricing";
import { selectAgentModel } from "../../../supabase/functions/agent-chat/model-routing";

describe("MedStation AI Core foundation", () => {
  it("keeps all clinical routing decisions intact", () => {
    expect(selectAgentModel({ agentType: "examinus" }).model).toBe(AI_MODELS.agentFast.id);
    expect(selectAgentModel({ agentType: "mediscuss" }).model).toBe(AI_MODELS.agentStrong.id);
    expect(selectAgentModel({ agentType: "clinicus", directAHEMode: true, aheTemplate: "uti_evolucao_v2" }).model).toBe(AI_MODELS.agentStrong.id);
  });
  it("catalogs existing models without guessing provider tariffs", () => {
    expect(selectCoreModel("clinical-high-fidelity").transport).toBe("responses");
    expect(modelProviderFromId("anthropic/claude-sonnet-5")).toBe("anthropic");
    expect(estimateKnownCostUSD("openai/gpt-6-astra", 1000, 200)).toBeNull();
    expect(estimateKnownCostUSD("google/gemini-3-flash-preview", 1000, 200)).toBeGreaterThan(0);
    expect(estimateKnownSTTCostUSD("openai/gpt-6-astra", 60)).toBeNull();
  });
  it("rejects tool impersonation and unverified patient context", () => {
    const ctx = { authenticatedUserId: "user-a", verifiedPatientId: "patient-a" };
    const good = { tool: "clinical.labs", userId: "user-a", patientId: "patient-a", requestId: "req1", purpose: "lab review" };
    expect(authorizeClinicalTool(good, ctx).accepted).toBe(true);
    expect(authorizeClinicalTool({ ...good, userId: "user-b" }, ctx).reason).toBe("user_mismatch");
    expect(authorizeClinicalTool({ ...good, patientId: "patient-b" }, ctx).reason).toBe("patient_unverified");
    expect(authorizeClinicalTool({ ...good, tool: "terminal.execute" }, ctx).reason).toBe("unknown_tool");
  });
  it("requires human approval for prescription drafting workflow", () => {
    expect(CLINICAL_TOOLS["clinical.prescription"].requiresHumanApproval).toBe(true);
    const decision = authorizeClinicalTool(
      { tool: "clinical.prescription", userId: "u", patientId: "p", requestId: "r", purpose: "draft" },
      { authenticatedUserId: "u", verifiedPatientId: "p" },
    );
    expect(decision).toMatchObject({ accepted: true, needsApproval: true });
  });
});
