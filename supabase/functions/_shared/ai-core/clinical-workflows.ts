/**
 * MedStation AI Core — deterministic, executable-in-tests clinical workflow planner.
 *
 * Hermes may propose requested steps, but it never gets to choose user/patient
 * identities, raw network URLs, models, credentials, or tool implementation.
 * This module only prepares an allowlisted plan. No patient data is persisted.
 */
import { authorizeClinicalTool, type ClinicalToolId } from "./clinical-tool-contract.ts";

export const WORKFLOW_MAX_STEPS = 4;
export const WORKFLOW_IDS = ["admission-review"] as const;
export type WorkflowId = typeof WORKFLOW_IDS[number];
export type WorkflowStep = {
  id: string;
  tool: ClinicalToolId;
  dependsOn: string[];
  needsApproval: boolean;
  kind: "draft" | "analysis";
};
export type WorkflowPlan = {
  workflow: WorkflowId;
  version: 1;
  requestId: string;
  steps: WorkflowStep[];
  dryRun: true;
};
export type WorkflowPlanResult =
  | { ok: true; plan: WorkflowPlan }
  | { ok: false; reason: "invalid_workflow" | "invalid_request" | "unauthorized_context"; detail?: string };

type ServerContext = {
  userId: string;
  /** Must be resolved by authenticated server code and checked for user ownership. */
  verifiedPatientId: string | null;
};

const ADMISSION_STEPS: ReadonlyArray<{ tool: ClinicalToolId; kind: "draft" | "analysis" }> = [
  { tool: "clinical.document", kind: "draft" },
  { tool: "clinical.labs", kind: "analysis" },
];

/** Never derive patient/user IDs from an LLM response. */
export function createClinicalWorkflowPlan(input: unknown, context: ServerContext): WorkflowPlanResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "invalid_request" };
  const raw = input as Record<string, unknown>;
  if (raw.workflow !== "admission-review") return { ok: false, reason: "invalid_workflow" };
  if (typeof raw.requestId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(raw.requestId)) {
    return { ok: false, reason: "invalid_request" };
  }
  if (raw.steps !== undefined || raw.userId !== undefined || raw.patientId !== undefined) {
    return { ok: false, reason: "invalid_request", detail: "Workflow and identities are server-controlled" };
  }
  if (!context.userId || !context.verifiedPatientId) return { ok: false, reason: "unauthorized_context" };

  const steps: WorkflowStep[] = [];
  for (const [i, item] of ADMISSION_STEPS.entries()) {
    const decision = authorizeClinicalTool({
      tool: item.tool,
      userId: context.userId,
      patientId: context.verifiedPatientId,
      requestId: raw.requestId,
      purpose: "admission-review",
    }, { authenticatedUserId: context.userId, verifiedPatientId: context.verifiedPatientId });
    if (!decision.accepted) return { ok: false, reason: "unauthorized_context" };
    steps.push({
      id: `step-${i + 1}`, tool: item.tool,
      dependsOn: [],
      needsApproval: decision.needsApproval,
      kind: item.kind,
    });
  }
  if (steps.length > WORKFLOW_MAX_STEPS) return { ok: false, reason: "invalid_request" };
  return { ok: true, plan: { workflow: "admission-review", version: 1, requestId: raw.requestId, steps, dryRun: true } };
}

/**
 * Validates any external/Hermes plan before it reaches the execution boundary.
 * Only the two fixed admission-review steps are supported in this phase.
 */
export function validateProposedWorkflowPlan(plan: unknown): plan is WorkflowPlan {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return false;
  const p = plan as Partial<WorkflowPlan>;
  if (p.workflow !== "admission-review" || p.version !== 1 || p.dryRun !== true) return false;
  if (typeof p.requestId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(p.requestId)) return false;
  if (!Array.isArray(p.steps) || p.steps.length !== ADMISSION_STEPS.length || p.steps.length > WORKFLOW_MAX_STEPS) return false;
  return p.steps.every((step, i) => {
    const expected = ADMISSION_STEPS[i];
    return !!step && step.id === `step-${i + 1}` && step.tool === expected.tool &&
      step.kind === expected.kind && step.needsApproval === false &&
      Array.isArray(step.dependsOn) && step.dependsOn.length === 0;
  });
}
