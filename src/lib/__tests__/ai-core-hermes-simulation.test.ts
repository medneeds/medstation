import { describe, expect, it } from "vitest";
import {
  createClinicalWorkflowPlan,
  validateProposedWorkflowPlan,
} from "../../../supabase/functions/_shared/ai-core/clinical-workflows";
import {
  simulateClinicalWorkflow,
  simulateHermesProposal,
} from "../../../supabase/functions/_shared/ai-core/hermes-simulation";
import { authorizeClinicalTool } from "../../../supabase/functions/_shared/ai-core/clinical-tool-contract";

const context = { userId: "doctor-1", verifiedPatientId: "synthetic-patient-1" };
const id = "admission_demo_0001";

describe("AI Core / Hermes clinical workflow simulation", () => {
  it("builds a fixed, clinically conservative 2-step plan", () => {
    const result = createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.dryRun).toBe(true);
    expect(result.plan.steps.map(s => s.tool)).toEqual(["clinical.document", "clinical.labs"]);
    expect(result.plan.steps.every(s => s.dependsOn.length === 0)).toBe(true);
    expect(validateProposedWorkflowPlan(result.plan)).toBe(true);
  });

  it("simulates Clinícus + Examinus without model calls or clinical responses", () => {
    const plan = createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id }, context);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(simulateHermesProposal(plan.plan, { authenticatedUserId: context.userId, verifiedPatientId: context.verifiedPatientId })).toEqual({
      ok: true, requestId: id, mode: "simulation", workflow: "admission-review",
      steps: [
        { tool: "clinical.document", target: "clinicus", status: "simulated" },
        { tool: "clinical.labs", target: "examinus", status: "simulated" },
      ],
      requiresMedicalReview: true,
    });
  });

  it("blocks patient without a server-verified association", () => {
    const plan = createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id }, context);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(simulateHermesProposal(plan.plan, { authenticatedUserId: context.userId, verifiedPatientId: null })).toEqual({
      ok: false, reason: "invalid_plan",
    });
    expect(simulateHermesProposal(plan.plan, { authenticatedUserId: "another-doctor", verifiedPatientId: context.verifiedPatientId })).toMatchObject({
      ok: true, mode: "simulation",
    });
    // This dry-run API cannot verify patient ownership. A production executor MUST
    // resolve patient ownership from server-side DB before invoking any clinical tool.
  });

  it("rejects arbitrary agent requests, extra steps and unsafe tool IDs", () => {
    expect(createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id, userId: "injected" }, context).ok).toBe(false);
    expect(createClinicalWorkflowPlan({ workflow: "admission-review", requestId: "!" }, context).ok).toBe(false);
    expect(createClinicalWorkflowPlan({ workflow: "prescribe", requestId: id }, context).ok).toBe(false);
    const plan = createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id }, context);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(simulateClinicalWorkflow({ ...plan.plan, steps: [...plan.plan.steps, { id: "step-3", tool: "clinical.prescription" }] })).toEqual({ ok: false, reason: "invalid_plan" });
    expect(validateProposedWorkflowPlan({ ...plan.plan, steps: [{ ...plan.plan.steps[0], tool: "terminal.execute" }, plan.plan.steps[1]] })).toBe(false);
  });

  it("does not allow prototype properties to masquerade as tools", () => {
    expect(authorizeClinicalTool({ tool: "__proto__", userId: "u", patientId: "p", requestId: "req1", purpose: "x" }, { authenticatedUserId: "u", verifiedPatientId: "p" }).reason).toBe("unknown_tool");
  });

  it("never simulates unauthorized workflow without server context", () => {
    expect(createClinicalWorkflowPlan({ workflow: "admission-review", requestId: id }, { userId: "doctor-1", verifiedPatientId: null })).toEqual({ ok: false, reason: "unauthorized_context" });
  });
});
