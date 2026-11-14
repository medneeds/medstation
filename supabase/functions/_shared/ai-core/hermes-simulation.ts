/**
 * Simulation-only execution boundary for Hermes proposals. No network calls,
 * clinical model invocations, database queries or patient text are performed.
 */
import { createClinicalWorkflowPlan, validateProposedWorkflowPlan, type WorkflowPlan } from "./clinical-workflows.ts";

export type WorkflowDryRunResult =
  | { ok: true; requestId: string; mode: "simulation"; workflow: "admission-review"; steps: Array<{
      tool: "clinical.document" | "clinical.labs"; status: "simulated"; target: "clinicus" | "examinus";
    }>; requiresMedicalReview: true }
  | { ok: false; reason: "invalid_plan" };

const ALLOWED_TARGETS = {
  "clinical.document": "clinicus",
  "clinical.labs": "examinus",
} as const;

/** Only a validated plan may produce a simulated trace. */
export function simulateClinicalWorkflow(untrustedPlan: unknown): WorkflowDryRunResult {
  if (!validateProposedWorkflowPlan(untrustedPlan)) return { ok: false, reason: "invalid_plan" };
  const plan: WorkflowPlan = untrustedPlan;
  return {
    ok: true, requestId: plan.requestId, mode: "simulation", workflow: plan.workflow,
    steps: plan.steps.map(s => ({
      tool: s.tool as keyof typeof ALLOWED_TARGETS, status: "simulated",
      target: ALLOWED_TARGETS[s.tool as keyof typeof ALLOWED_TARGETS],
    })),
    requiresMedicalReview: true,
  };
}

/**
 * Hermes output is treated as untrusted. The caller supplies verified context,
 * never the agent. Currently, all actual tool execution is explicitly disabled.
 */
export function simulateHermesProposal(
  proposedPlan: unknown,
  context: { authenticatedUserId: string; verifiedPatientId: string | null },
): WorkflowDryRunResult {
  if (!validateProposedWorkflowPlan(proposedPlan)) return { ok: false, reason: "invalid_plan" };
  const built = createClinicalWorkflowPlan(
    { workflow: "admission-review", requestId: proposedPlan.requestId },
    { userId: context.authenticatedUserId, verifiedPatientId: context.verifiedPatientId },
  );
  if (!built.ok || JSON.stringify(built.plan) !== JSON.stringify(proposedPlan)) {
    return { ok: false, reason: "invalid_plan" };
  }
  return simulateClinicalWorkflow(built.plan);
}
