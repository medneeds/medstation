import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const env = {
  PATH: process.env.PATH ?? "",
  MEDSTATION_MCP_STAGING_ENABLED: "true",
  MEDSTATION_STAGING_URL: "https://stagingprojectref001.supabase.co/functions/v1/ai-core-hermes-sandbox",
  MEDSTATION_STAGING_PROJECT_REF: "stagingprojectref001",
  MEDSTATION_PRODUCTION_PROJECT_REF: "productionproject001",
  MEDSTATION_STAGING_JWT: "short-lived-admin-jwt",
  MEDSTATION_SUPABASE_ANON_KEY: "publishable-test-key",
};
const rpc = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params });

test("stdio MCP -> HTTP adapter -> synthetic staging response, isolated end to end", async () => {
  const preloader = fileURLToPath(new URL("./test-fixtures/mock-staging-fetch.mjs", import.meta.url));
  const server = fileURLToPath(new URL("./server.mjs", import.meta.url));
  const child = spawn(process.execPath, ["--import", preloader, server], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk.toString().slice(0, 1000); });
  try {
    const replies = await new Promise((resolve, reject) => {
      let buffer = "";
      const found = new Map();
      const timeout = setTimeout(() => reject(new Error("MCP process timeout")), 5000);
      child.stdout.on("data", chunk => {
        buffer += chunk.toString();
        let index;
        while ((index = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          let message;
          try { message = JSON.parse(line); }
          catch (e) { clearTimeout(timeout); reject(e); return; }
          found.set(message.id, message);
          if (found.size === 3) { clearTimeout(timeout); resolve(found); return; }
        }
      });
      child.on("error", reject);
      child.on("exit", code => {
        if (found.size < 3) { clearTimeout(timeout); reject(new Error("MCP exited: " + code)); }
      });
      child.stdin.write(JSON.stringify(rpc(1, "initialize", { protocolVersion: "2025-06-18" })) + "\n");
      child.stdin.write(JSON.stringify(rpc(2, "tools/list")) + "\n");
      child.stdin.write(JSON.stringify(rpc(3, "tools/call", {
        name: "medstation_simulate_admission",
        arguments: { requestId: "synthetic_001" },
      })) + "\n");
    });

    assert.equal(replies.get(1).result.serverInfo.name, "medstation-hermes-sandbox");
    assert.deepEqual(replies.get(2).result.tools.map(t => t.name), ["medstation_simulate_admission"]);
    const call = replies.get(3).result;
    assert.equal(call.isError, false);
    const body = JSON.parse(call.content[0].text);
    assert.equal(body.environment, "synthetic-staging");
    assert.deepEqual(body.simulation.steps, [
      { tool: "clinical.document", target: "clinicus", status: "simulated" },
      { tool: "clinical.labs", target: "examinus", status: "simulated" },
    ]);
    assert.equal(call.content[0].text.includes("MUST_NEVER_BE_EMITTED"), false);
    assert.equal(stderr.includes("short-lived-admin-jwt"), false);
  } finally {
    child.kill("SIGTERM");
  }
});
