/**
 * AI Core's clinical tool catalog for future Hermes integration.
 * This file declares intent and permission boundaries. It does NOT execute tools.
 * The server must still authorize each request against user, tenant and patient.
 */
export const CLINICAL_TOOLS = {
  "clinical.document": { operation: "draft", patientContext: "required", requiresHumanApproval: false, output: "draft" },
  "clinical.labs": { operation: "interpret", patientContext: "required", requiresHumanApproval: false, output: "analysis" },
  "clinical.scores": { operation: "calculate", patientContext: "required", requiresHumanApproval: false, output: "result" },
  "clinical.prescription": { operation: "draft", patientContext: "required", requiresHumanApproval: true, output: "draft" },
  "clinical.ecg": { operation: "interpret", patientContext: "required", requiresHumanApproval: false, output: "analysis" },
  "clinical.radiology": { operation: "interpret", patientContext: "required", requiresHumanApproval: false, output: "analysis" },
} as const;

export type ClinicalToolId = keyof typeof CLINICAL_TOOLS;
export type ClinicalToolRequest = {
  tool: ClinicalToolId;
  userId: string;
  patientId: string;
  purpose: string;
  requestId: string;
};

export type ClinicalToolAuthorization = {
  accepted: boolean;
  reason: "ok" | "unknown_tool" | "missing_context" | "user_mismatch" | "patient_unverified";
  needsApproval: boolean;
};

/** Pure guard for orchestration plans. Never trust a model-provided userId/patientId. */
export function authorizeClinicalTool(
  input: unknown,
  context: { authenticatedUserId: string; verifiedPatientId: string | null },
): ClinicalToolAuthorization {
  if (!input || typeof input !== "object") {
    return { accepted: false, reason: "missing_context", needsApproval: false };
  }
  const req = input as Partial<ClinicalToolRequest>;
  if (typeof req.tool !== "string" || !(req.tool in CLINICAL_TOOLS)) {
    return { accepted: false, reason: "unknown_tool", needsApproval: false };
  }
  const tool = CLINICAL_TOOLS[req.tool as ClinicalToolId];
  if (!req.userId || !req.patientId || !req.requestId || !req.purpose) {
    return { accepted: false, reason: "missing_context", needsApproval: tool.requiresHumanApproval };
  }
  if (req.userId !== context.authenticatedUserId) {
    return { accepted: false, reason: "user_mismatch", needsApproval: tool.requiresHumanApproval };
  }
  if (!context.verifiedPatientId || req.patientId !== context.verifiedPatientId) {
    return { accepted: false, reason: "patient_unverified", needsApproval: tool.requiresHumanApproval };
  }
  return { accepted: true, reason: "ok", needsApproval: tool.requiresHumanApproval };
}
