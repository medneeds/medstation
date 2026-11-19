import test from "node:test";
import assert from "node:assert/strict";
import { verifyHermes } from "./verify-hermes.mjs";

test("reports explicit missing Hermes binary without claiming integration", async () => {
  const result = await verifyHermes({
    runner: async () => ({ ok: false, reason: "not_installed" }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "HERMES_NOT_INSTALLED");
});

test("does not attempt MCP test before server registration", async () => {
  const calls = [];
  const result = await verifyHermes({
    runner: async (_cmd, args) => {
      calls.push(args.join(" "));
      return { ok: true, containsName: false };
    },
  });
  assert.equal(result.code, "MEDSTATION_MCP_NOT_REGISTERED");
  assert.deepEqual(calls, ["--version", "mcp list"]);
});

test("reports failed connection separately from successful discovery", async () => {
  const calls = [];
  const result = await verifyHermes({
    runner: async (_cmd, args) => {
      calls.push(args.join(" "));
      if (args.join(" ") === "mcp test medstation_sandbox") return { ok: false, code: 1 };
      return { ok: true, containsName: true };
    },
  });
  assert.equal(result.code, "MEDSTATION_MCP_TEST_FAILED");
  assert.deepEqual(calls, ["--version", "mcp list", "mcp test medstation_sandbox"]);
});

test("confirms only MCP transport and never claims clinical execution", async () => {
  const result = await verifyHermes({
    runner: async () => ({ ok: true, containsName: true }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, "MCP_CONNECTION_VERIFIED");
  assert.match(result.note, /clinical execution not verified/);
});
