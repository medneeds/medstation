/**
 * MedStation Hermes operational verification.
 * Safe and read-only: never installs Hermes, modifies user config, or calls clinical tools.
 * Checks that the installed Hermes executable can discover the registered sandbox MCP.
 *
 * Usage: node hermes-bridge/verify-hermes.mjs
 * Optional: MEDSTATION_HERMES_MCP_NAME=medstation_sandbox
 */
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const MCP_NAME = /^[a-zA-Z0-9_-]{1,64}$/.test(process.env.MEDSTATION_HERMES_MCP_NAME || "")
  ? process.env.MEDSTATION_HERMES_MCP_NAME
  : "medstation_sandbox";

function subprocess(command, args, { timeout = 12000, spawnImpl = spawn } = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawnImpl(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", CI: "1" },
    });
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ ok: false, reason: "timeout" });
    }, timeout);
    child.stdout?.on("data", (buf) => { stdout += String(buf).slice(0, 4096 - stdout.length); });
    child.stderr?.on("data", (buf) => { stderr += String(buf).slice(0, 4096 - stderr.length); });
    child.on("error", (err) => finish({ ok: false, reason: err.code === "ENOENT" ? "not_installed" : "process_error" }));
    child.on("close", (code) => finish({
      ok: code === 0,
      code,
      // Never print tool output; it can contain paths, URLs or account context.
      containsName: (stdout + stderr).includes(MCP_NAME),
    }));
  });
}

export async function verifyHermes({ runner = subprocess } = {}) {
  const version = await runner("hermes", ["--version"]);
  if (!version.ok) {
    return {
      ok: false, code: version.reason === "not_installed" ? "HERMES_NOT_INSTALLED" : "HERMES_UNAVAILABLE",
      requiredAction: "Install Hermes only on an isolated staging host",
    };
  }

  const listed = await runner("hermes", ["mcp", "list"]);
  if (!listed.ok) return { ok: false, code: "MCP_LIST_FAILED" };
  if (!listed.containsName) return { ok: false, code: "MEDSTATION_MCP_NOT_REGISTERED" };

  const connection = await runner("hermes", ["mcp", "test", MCP_NAME], { timeout: 20000 });
  if (!connection.ok) return { ok: false, code: "MEDSTATION_MCP_TEST_FAILED" };
  return { ok: true, code: "MCP_CONNECTION_VERIFIED", note: "MCP tool connection only; clinical execution not verified" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyHermes();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 1;
}
