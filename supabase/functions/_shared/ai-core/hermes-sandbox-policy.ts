/**
 * Fail-closed policy for the Hermes synthetic sandbox.
 * No production patient identifier, narrative, plan or tools may enter this API.
 */
export const SANDBOX_PATIENT_ID = "synthetic-admission-patient";
export const SANDBOX_ACTOR_ID = "synthetic-workflow-actor";
export const SANDBOX_MAX_BODY_BYTES = 1024;
export type SandboxRequest = { workflow: "admission-review"; requestId: string };

export function isSandboxEnabled(env: {
  AI_CORE_ENVIRONMENT?: string;
  AI_CORE_HERMES_SANDBOX_ENABLED?: string;
  AI_CORE_STAGING_PROJECT_REF?: string;
  AI_CORE_PRODUCTION_PROJECT_REF?: string;
  SUPABASE_URL?: string;
}): boolean {
  const staging = env.AI_CORE_STAGING_PROJECT_REF;
  const production = env.AI_CORE_PRODUCTION_PROJECT_REF;
  // Require explicit and distinct project references; never trust a staging flag alone.
  if (!staging || !production || !/^[a-z0-9]{20}$/.test(staging) ||
    !/^[a-z0-9]{20}$/.test(production) || staging === production) return false;
  return env.AI_CORE_ENVIRONMENT === "staging" &&
    env.AI_CORE_HERMES_SANDBOX_ENABLED === "true" &&
    env.SUPABASE_URL === `https://${staging}.supabase.co`;
}

export function parseSandboxRequest(input: unknown): SandboxRequest | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const keys = Object.keys(r).sort();
  if (keys.join(",") !== "requestId,workflow") return null;
  if (r.workflow !== "admission-review" || typeof r.requestId !== "string") return null;
  if (!/^synthetic_[A-Za-z0-9_-]{1,90}$/.test(r.requestId)) return null;
  return { workflow: "admission-review", requestId: r.requestId };
}
