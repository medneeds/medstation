import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createBridge } from "./server.mjs";

const rpc = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params });
const validEnv = {
  MEDSTATION_MCP_STAGING_ENABLED: "true",
  MEDSTATION_STAGING_URL: "https://stagingprojectref001.supabase.co/functions/v1/ai-core-hermes-sandbox",
  MEDSTATION_STAGING_JWT: "short-lived-admin-jwt",
  MEDSTATION_STAGING_PROJECT_REF: "stagingprojectref001",
  MEDSTATION_PRODUCTION_PROJECT_REF: "productionproject001",
  MEDSTATION_SUPABASE_ANON_KEY: "publishable-test-key",
};

test("MCP handshake and one-tool allowlist work offline", async () => {
  const handle = createBridge({ env: {} });
  const init = await handle(rpc(1, "initialize", { protocolVersion: "2025-06-18" }));
  assert.equal(init.result.serverInfo.name, "medstation-hermes-sandbox");
  const tools = await handle(rpc(2, "tools/list"));
  assert.deepEqual(tools.result.tools.map(t => t.name), ["medstation_simulate_admission"]);
  assert.equal(tools.result.tools[0].inputSchema.additionalProperties, false);
  assert.equal(await handle({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

test("not enabled, invalid IDs and unknown tools never call network", async () => {
  let requests = 0;
  const handle = createBridge({ env: {}, fetcher: async () => { requests++; throw Error("network"); } });
  const blocked = await handle(rpc(1, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
  assert.equal(blocked.result.isError, true);
  assert.equal(JSON.parse(blocked.result.content[0].text).error, "sandbox_not_configured");
  const invalid = await handle(rpc(2, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001", patient: "name" } }));
  assert.equal(invalid.result.isError, true);
  const unknown = await handle(rpc(3, "tools/call", { name: "execute_terminal", arguments: { requestId: "synthetic_001" } }));
  assert.equal(unknown.error.code, -32602);
  assert.equal(requests, 0);
});

test("strict endpoint prevents SSRF or accidental production URL", async () => {
  for (const url of [
    "http://localhost/functions/v1/ai-core-hermes-sandbox",
    "https://api.evil.com/functions/v1/ai-core-hermes-sandbox",
    "https://project.supabase.co.evil.com/functions/v1/ai-core-hermes-sandbox",
    "https://project.supabase.co/rest/v1/patients",
    "https://productionproject001.supabase.co/functions/v1/ai-core-hermes-sandbox",
    "https://anotherprojectref001.supabase.co/functions/v1/ai-core-hermes-sandbox",
  ]) {
    const handle = createBridge({ env: { ...validEnv, MEDSTATION_STAGING_URL: url } });
    const response = await handle(rpc(10, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
    assert.equal(JSON.parse(response.result.content[0].text).error, "sandbox_not_configured");
  }
});

test("requires explicit project pinning and rejects production project", async () => {
  for (const env of [
    { ...validEnv, MEDSTATION_STAGING_PROJECT_REF: undefined },
    { ...validEnv, MEDSTATION_PRODUCTION_PROJECT_REF: undefined },
    { ...validEnv, MEDSTATION_PRODUCTION_PROJECT_REF: validEnv.MEDSTATION_STAGING_PROJECT_REF },
    { ...validEnv, MEDSTATION_STAGING_PROJECT_REF: "wrongprojectref00000" },
  ]) {
    const handle = createBridge({ env });
    const reply = await handle(rpc(12, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
    assert.equal(JSON.parse(reply.result.content[0].text).error, "sandbox_not_configured");
  }
});

test("simulated staging API request sends only fixed synthetic shape", async () => {
  let called = 0;
  const handle = createBridge({
    env: validEnv,
    fetcher: async (url, opts) => {
      called++;
      assert.equal(url, validEnv.MEDSTATION_STAGING_URL);
      assert.equal(opts.headers.Authorization, "Bearer short-lived-admin-jwt");
      assert.equal(opts.headers.apikey, "publishable-test-key");
      assert.equal(opts.redirect, "error");
      assert.deepEqual(JSON.parse(opts.body), { workflow: "admission-review", requestId: "synthetic_001" });
      return new Response(JSON.stringify({
        environment: "synthetic-staging",
        simulation: {
          ok: true, mode: "simulation", workflow: "admission-review", requestId: "synthetic_001",
          requiresMedicalReview: true,
          steps: [
            { tool: "clinical.document", target: "clinicus", status: "simulated" },
            { tool: "clinical.labs", target: "examinus", status: "simulated" },
          ],
        },
        patient_name: "INJECTED_PATIENT_DATA_MUST_NOT_LEAK",
      }), { status: 200 });
    },
  });
  const response = await handle(rpc(11, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
  assert.equal(called, 1);
  assert.equal(response.result.isError, false);
  assert.equal(response.result.content[0].text.includes("INJECTED_PATIENT_DATA_MUST_NOT_LEAK"), false);
  assert.equal(JSON.parse(response.result.content[0].text).simulation.steps.length, 2);
});

test("unexpected or forbidden upstream responses never leak payloads", async () => {
  const forbidden = createBridge({ env: validEnv, fetcher: async () => new Response("private data", { status: 403 }) });
  const r1 = await forbidden(rpc(1, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
  assert.equal(r1.result.isError, true);
  assert.equal(r1.result.content[0].text.includes("private data"), false);
  const wrong = createBridge({ env: validEnv, fetcher: async () => new Response(JSON.stringify({ simulation: { ok: true, mode: "simulation", requestId: "synthetic_001" }, environment: "production" }), { status: 200 }) });
  const r2 = await wrong(rpc(2, "tools/call", { name: "medstation_simulate_admission", arguments: { requestId: "synthetic_001" } }));
  assert.equal(JSON.parse(r2.result.content[0].text).error, "unexpected_sandbox_response");
});

test("oversized upstream payloads are rejected and not echoed to Hermes", async () => {
  const handle = createBridge({
    env: validEnv,
    fetcher: async () => new Response(JSON.stringify({
      environment: "synthetic-staging",
      secret: "DO_NOT_LEAK_" + "X".repeat(9000),
    }), { status: 200 }),
  });
  const res = await handle(rpc(14, "tools/call", {
    name: "medstation_simulate_admission",
    arguments: { requestId: "synthetic_001" },
  }));
  assert.equal(res.result.isError, true);
  assert.equal(res.result.content[0].text.includes("DO_NOT_LEAK"), false);
});

test("actual stdio subprocess answers initialize and tools/list with JSON-RPC only", async () => {
  const child = spawn(process.execPath, [new URL("./server.mjs", import.meta.url).pathname], {
    stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH || "" },
  });
  try {
    const data = await new Promise((resolve, reject) => {
      let buffer = "";
      const messages = [];
      const timer = setTimeout(() => reject(Error("stdio timeout")), 2500);
      child.stdout.on("data", chunk => {
        buffer += chunk.toString();
        let split;
        while ((split = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, split); buffer = buffer.slice(split + 1);
          messages.push(JSON.parse(line));
          if (messages.length === 2) { clearTimeout(timer); resolve(messages); return; }
        }
      });
      child.on("error", reject);
      child.stdin.write(JSON.stringify(rpc(1, "initialize", { protocolVersion: "2025-06-18" })) + "\n");
      child.stdin.write(JSON.stringify(rpc(2, "tools/list")) + "\n");
    });
    assert.equal(data[0].result.serverInfo.name, "medstation-hermes-sandbox");
    assert.equal(data[1].result.tools.length, 1);
  } finally {
    child.kill("SIGTERM");
  }
});
