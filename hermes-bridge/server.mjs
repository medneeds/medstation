/**
 * Standalone MCP stdio bridge for Hermes Agent.
 * Exposes exactly ONE synthetic, read-only MedStation workflow.
 * Node >=22; no npm dependencies; no production credentials or patient data.
 */
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const TOOL = "medstation_simulate_admission";
const TOOL_INFO = {
  name: TOOL,
  title: "MedStation synthetic admission dry run",
  description: "Simulates a fixed Clínicus + Examinus workflow. Synthetic IDs only. No patient data, model inference, clinical notes or external actions.",
  inputSchema: {
    type: "object",
    properties: { requestId: { type: "string", pattern: "^synthetic_[A-Za-z0-9_-]{1,90}$", maxLength: 100 } },
    required: ["requestId"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};

function validRequest(args) {
  return args && typeof args === "object" && !Array.isArray(args) &&
    Object.keys(args).length === 1 && typeof args.requestId === "string" &&
    /^synthetic_[A-Za-z0-9_-]{1,90}$/.test(args.requestId);
}

/**
 * Explicit project pinning prevents accidentally calling a production instance.
 * Merely matching *.supabase.co is not sufficient.
 */
function safeStagingUrl(value, stagingRef, productionRef) {
  if (!value || !/^[a-z0-9]{20}$/.test(stagingRef ?? "") ||
      !/^[a-z0-9]{20}$/.test(productionRef ?? "") || stagingRef === productionRef) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== `${stagingRef}.supabase.co` ||
      url.pathname !== "/functions/v1/ai-core-hermes-sandbox" ||
      url.search || url.hash || url.username || url.password || url.port) return null;
    return url.href;
  } catch { return null; }
}

/** Never relay arbitrary upstream fields (including accidental patient data). */
function sanitizeSimulation(data, requestId) {
  if (data?.environment !== "synthetic-staging" || data?.simulation?.ok !== true ||
      data?.simulation?.mode !== "simulation" || data?.simulation?.workflow !== "admission-review" ||
      data?.simulation?.requestId !== requestId || data?.simulation?.requiresMedicalReview !== true) return null;
  const steps = data.simulation.steps;
  if (!Array.isArray(steps) || steps.length !== 2) return null;
  const expected = [
    { tool: "clinical.document", target: "clinicus", status: "simulated" },
    { tool: "clinical.labs", target: "examinus", status: "simulated" },
  ];
  if (!steps.every((step, i) => step?.tool === expected[i].tool &&
      step?.target === expected[i].target && step?.status === expected[i].status)) return null;
  return {
    environment: "synthetic-staging",
    simulation: {
      ok: true, mode: "simulation", workflow: "admission-review", requestId,
      requiresMedicalReview: true, steps: expected,
    },
  };
}

/** Enforce a small upstream response limit before parsing any JSON. */
async function readBoundedJson(response, maxBytes = 8192) {
  if (!response.body) throw new Error("empty response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("oversized response");
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

const error = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
const result = (id, payload) => ({ jsonrpc: "2.0", id, result: payload });
const toolText = (payload, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(payload) }],
  isError,
});

export function createBridge({ env = process.env, fetcher = fetch } = {}) {
  return async function handle(message) {
    if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0") {
      return error(null, -32600, "Invalid JSON-RPC request");
    }
    if (typeof message.method !== "string") return null;
    if (!Object.hasOwn(message, "id")) return null; // notifications have no reply
    const id = message.id;
    switch (message.method) {
      case "initialize":
        return result(id, {
          protocolVersion: ["2025-06-18", "2025-11-25", "2026-07-28"].includes(message.params?.protocolVersion)
            ? message.params.protocolVersion : "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "medstation-hermes-sandbox", version: "0.1.0" },
        });
      case "ping": return result(id, {});
      case "tools/list": return result(id, { tools: [TOOL_INFO] });
      case "tools/call": {
        if (message.params?.name !== TOOL) return error(id, -32602, "Unknown tool");
        const args = message.params?.arguments;
        if (!validRequest(args)) return result(id, toolText({ error: "invalid_synthetic_request" }, true));
        const url = safeStagingUrl(
          env.MEDSTATION_STAGING_URL, env.MEDSTATION_STAGING_PROJECT_REF, env.MEDSTATION_PRODUCTION_PROJECT_REF,
        );
        const token = env.MEDSTATION_STAGING_JWT;
        const anon = env.MEDSTATION_SUPABASE_ANON_KEY;
        if (!url || !token || !anon || env.MEDSTATION_MCP_STAGING_ENABLED !== "true") {
          return result(id, toolText({ error: "sandbox_not_configured" }, true));
        }
        try {
          const response = await fetcher(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, apikey: anon, "Content-Type": "application/json" },
            body: JSON.stringify({ workflow: "admission-review", requestId: args.requestId }),
            signal: AbortSignal.timeout(5000),
            redirect: "error",
          });
          if (!response.ok) return result(id, toolText({ error: "sandbox_unavailable", httpStatus: response.status }, true));
          const data = await readBoundedJson(response);
          const safe = sanitizeSimulation(data, args.requestId);
          if (!safe) return result(id, toolText({ error: "unexpected_sandbox_response" }, true));
          return result(id, toolText(safe));
        } catch {
          return result(id, toolText({ error: "sandbox_unavailable" }, true));
        }
      }
      default: return error(id, -32601, "Method not found");
    }
  };
}

async function main() {
  const handle = createBridge();
  const input = readline.createInterface({ input: process.stdin, terminal: false, crlfDelay: Infinity });
  for await (const line of input) {
    if (Buffer.byteLength(line) > 65536) continue;
    let message;
    try { message = JSON.parse(line); }
    catch { process.stdout.write(JSON.stringify(error(null, -32700, "Parse error")) + "\n"); continue; }
    const reply = await handle(message);
    if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => { process.exitCode = 1; });
}
