/**
 * Hermes sandbox endpoint — staging only, admin authentication, synthetic IDs.
 * NO patient data, NO actual agents, NO AI calls, NO clinical execution.
 * Deployment is deliberately not part of this pull request.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserIdFromAuth } from "../_shared/auth-helpers.ts";
import { createClinicalWorkflowPlan } from "../_shared/ai-core/clinical-workflows.ts";
import { simulateHermesProposal } from "../_shared/ai-core/hermes-simulation.ts";
import {
  isSandboxEnabled, parseSandboxRequest, SANDBOX_ACTOR_ID, SANDBOX_PATIENT_ID, SANDBOX_MAX_BODY_BYTES,
} from "../_shared/ai-core/hermes-sandbox-policy.ts";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
function reply(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers });
}

/** A streaming body cap also protects requests using chunked encoding. */
async function readBounded(req: Request): Promise<string | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > SANDBOX_MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

serve(async (req) => {
  // Deliberately no browser CORS. An external Hermes subprocess calls server-to-server.
  if (!isSandboxEnabled({
    AI_CORE_ENVIRONMENT: Deno.env.get("AI_CORE_ENVIRONMENT"),
    AI_CORE_HERMES_SANDBOX_ENABLED: Deno.env.get("AI_CORE_HERMES_SANDBOX_ENABLED"),
    AI_CORE_STAGING_PROJECT_REF: Deno.env.get("AI_CORE_STAGING_PROJECT_REF"),
    AI_CORE_PRODUCTION_PROJECT_REF: Deno.env.get("AI_CORE_PRODUCTION_PROJECT_REF"),
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  })) return reply(404, { error: "not_found" });

  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply(415, { error: "unsupported_media_type" });
  }

  const userId = await getUserIdFromAuth(req);
  if (!userId) return reply(401, { error: "unauthorized" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(503, { error: "unavailable" });

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: hasRole, error: roleError } = await admin.rpc("has_role", {
      _user_id: userId, _role: "admin",
    });
    if (roleError || hasRole !== true) return reply(403, { error: "forbidden" });
  } catch {
    return reply(503, { error: "unavailable" });
  }

  const body = await readBounded(req);
  if (body === null) return reply(413, { error: "body_too_large_or_invalid" });
  let raw: unknown;
  try { raw = JSON.parse(body); }
  catch { return reply(400, { error: "invalid_json" }); }
  const input = parseSandboxRequest(raw);
  if (!input) return reply(400, { error: "invalid_synthetic_request" });

  const plan = createClinicalWorkflowPlan(input, {
    userId: SANDBOX_ACTOR_ID, verifiedPatientId: SANDBOX_PATIENT_ID,
  });
  if (!plan.ok) return reply(422, { error: "invalid_plan" });

  const simulation = simulateHermesProposal(plan.plan, {
    authenticatedUserId: SANDBOX_ACTOR_ID, verifiedPatientId: SANDBOX_PATIENT_ID,
  });
  if (!simulation.ok) return reply(422, { error: "simulation_failed" });

  return reply(200, { simulation, plan: plan.plan, environment: "synthetic-staging" });
});
