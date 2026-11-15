import { describe, expect, it } from "vitest";
import {
  isSandboxEnabled, parseSandboxRequest, SANDBOX_PATIENT_ID, SANDBOX_ACTOR_ID,
} from "../../../supabase/functions/_shared/ai-core/hermes-sandbox-policy";
import { createClinicalWorkflowPlan } from "../../../supabase/functions/_shared/ai-core/clinical-workflows";
import { simulateHermesProposal } from "../../../supabase/functions/_shared/ai-core/hermes-simulation";

describe("Hermes sandbox policy (no PHI, deny-by-default)", () => {
  it("requires staging flag AND project-level isolation from production", () => {
    const valid = {
      AI_CORE_ENVIRONMENT: "staging",
      AI_CORE_HERMES_SANDBOX_ENABLED: "true",
      AI_CORE_STAGING_PROJECT_REF: "stagingprojectref001",
      AI_CORE_PRODUCTION_PROJECT_REF: "productionproject001",
      SUPABASE_URL: "https://stagingprojectref001.supabase.co",
    };
    expect(isSandboxEnabled(valid)).toBe(true);
    expect(isSandboxEnabled({ ...valid, AI_CORE_ENVIRONMENT: "production" })).toBe(false);
    expect(isSandboxEnabled({ ...valid, AI_CORE_HERMES_SANDBOX_ENABLED: "false" })).toBe(false);
    expect(isSandboxEnabled({ ...valid, SUPABASE_URL: "https://productionproject001.supabase.co" })).toBe(false);
    expect(isSandboxEnabled({ ...valid, AI_CORE_PRODUCTION_PROJECT_REF: "stagingprojectref001" })).toBe(false);
    expect(isSandboxEnabled({ ...valid, AI_CORE_STAGING_PROJECT_REF: undefined })).toBe(false);
  });
  it("only accepts exact two-field synthetic requests", () => {
    const request = { workflow: "admission-review", requestId: "synthetic_12345" };
    expect(parseSandboxRequest(request)).toEqual(request);
    for (const input of [
      { ...request, patientId: "real-patient" },
      { ...request, notes: "clinical history" },
      { ...request, userId: "someone" },
      { ...request, steps: [] },
      { workflow: "clinical.prescription", requestId: "synthetic_12345" },
      { workflow: "admission-review", requestId: "invalid id" },
      { workflow: "admission-review", requestId: "patient-123456" },
      null, [],
    ]) expect(parseSandboxRequest(input)).toBeNull();
  });
  it("builds the fixed synthetic-only plan, never inferring identity from user input", () => {
    const req = parseSandboxRequest({ workflow: "admission-review", requestId: "synthetic_12345" });
    expect(req).not.toBeNull();
    const plan = createClinicalWorkflowPlan(req, { userId: SANDBOX_ACTOR_ID, verifiedPatientId: SANDBOX_PATIENT_ID });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const result = simulateHermesProposal(plan.plan, {
      authenticatedUserId: SANDBOX_ACTOR_ID, verifiedPatientId: SANDBOX_PATIENT_ID,
    });
    expect(result).toMatchObject({
      ok: true, mode: "simulation", requiresMedicalReview: true,
      steps: [
        { target: "clinicus", status: "simulated" },
        { target: "examinus", status: "simulated" },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("patientId");
  });
});
