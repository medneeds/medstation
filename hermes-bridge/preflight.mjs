/**
 * Safe operational check for the Hermes MCP adapter.
 * Default mode is offline; it does not contact external providers or Supabase.
 * --staging explicitly calls the synthetic staging endpoint and never logs secrets.
 */
import { createBridge } from "./server.mjs";

const live = process.argv.includes("--staging");
const rpc = (id, method, params = {}) => ({ jsonrpc: "2.0", id, method, params });
const handle = createBridge({ env: live ? process.env : {} });
const report = { mode: live ? "synthetic-staging" : "offline", checks: [] };

function add(name, ok) {
  report.checks.push({ name, passed: ok });
  if (!ok) process.exitCode = 1;
}

try {
  const init = await handle(rpc(1, "initialize", { protocolVersion: "2025-06-18" }));
  add("mcp_initialize", init?.result?.serverInfo?.name === "medstation-hermes-sandbox");
  const list = await handle(rpc(2, "tools/list"));
  const toolNames = list?.result?.tools?.map(t => t.name);
  add("single_synthetic_tool", JSON.stringify(toolNames) === JSON.stringify(["medstation_simulate_admission"]));
  const output = await handle(rpc(3, "tools/call", {
    name: "medstation_simulate_admission",
    arguments: { requestId: "synthetic_preflight_001" },
  }));
  const content = JSON.parse(output?.result?.content?.[0]?.text ?? "{}");
  if (live) {
    add("staging_workflow_only", output?.result?.isError === false &&
      content?.environment === "synthetic-staging" &&
      content?.simulation?.requestId === "synthetic_preflight_001" &&
      content?.simulation?.steps?.length === 2);
  } else {
    add("offline_denies_network", output?.result?.isError === true &&
      content.error === "sandbox_not_configured");
  }
} catch {
  add("mcp_protocol", false);
}
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
