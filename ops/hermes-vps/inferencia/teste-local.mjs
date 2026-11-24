/**
 * Verificações locais do teste de inferência, sem credencial e sem Hermes.
 * Escrito pelo Claude em 24/11/2026.
 *
 *   node --test ops/hermes-vps/inferencia/teste-local.mjs
 *
 * O que usa de verdade: a ponte da MedStation (hermes-bridge/server.mjs), o
 * verificador e o executor. O que é simulado: o Hermes e o modelo (um servidor
 * HTTP local que responde no formato documentado de POST /v1/responses) e a
 * função da homologação (um `fetch` falso, como no fixture do repositório).
 * Nada aqui prova que o Hermes real ou um modelo real se comportam assim.
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBridge } from "../../../hermes-bridge/server.mjs";
import {
  WIRE_TOOL_NAME, findForbidden, redactRecord, unwrapToolPayload, verifyRecord,
} from "./verificar-registro.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const EXECUTOR = join(here, "executar-teste-inferencia.mjs");
const REQUEST_ID = "synthetic_e2e_0123456789ab";
const FAKE_API_KEY = "chave-ficticia-do-teste-local";

/** Texto que a ponte REAL devolve quando a função responde como no fixture do repositório. */
async function bridgeToolText(requestId, { upstream } = {}) {
  const handle = createBridge({
    env: {
      MEDSTATION_MCP_STAGING_ENABLED: "true",
      MEDSTATION_STAGING_URL: "https://stagingprojectref001.supabase.co/functions/v1/ai-core-hermes-sandbox",
      MEDSTATION_STAGING_JWT: "short-lived-admin-jwt",
      MEDSTATION_STAGING_PROJECT_REF: "stagingprojectref001",
      MEDSTATION_PRODUCTION_PROJECT_REF: "productionproject001",
      MEDSTATION_SUPABASE_ANON_KEY: "publishable-test-key",
    },
    fetcher: async (_url, init) => {
      const request = JSON.parse(init.body);
      return new Response(JSON.stringify(upstream ?? {
        environment: "synthetic-staging",
        hidden_patient_data: "MUST_NEVER_BE_EMITTED",
        simulation: {
          ok: true, mode: "simulation", workflow: "admission-review",
          requestId: request.requestId, requiresMedicalReview: true,
          steps: [
            { tool: "clinical.document", target: "clinicus", status: "simulated" },
            { tool: "clinical.labs", target: "examinus", status: "simulated" },
          ],
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const reply = await handle({
    jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "medstation_simulate_admission", arguments: { requestId } },
  });
  return { text: reply.result.content[0].text, isError: reply.result.isError };
}

/** Registro no formato de POST /v1/responses do Hermes v0.23.1 (resposta única). */
function makeRecord({ requestId = REQUEST_ID, toolText, name = WIRE_TOOL_NAME, args, finalText, extraItems = [] } = {}) {
  return {
    id: "resp_local_0001", object: "response", status: "completed", model: "hermes-agent",
    output: [
      { id: "fc_1", type: "function_call", status: "completed", name,
        arguments: JSON.stringify(args ?? { requestId }), call_id: "call_1" },
      // O Hermes embrulha o texto de uma ferramenta MCP em {"result": "<texto>"}.
      { id: "fco_1", type: "function_call_output", status: "completed", call_id: "call_1",
        output: JSON.stringify({ result: toolText }) },
      ...extraItems,
      { type: "message", role: "assistant",
        content: [{ type: "output_text", text: finalText ?? "Ambiente synthetic-staging; etapas clinicus e examinus simuladas." }] },
    ],
    usage: { input_tokens: 1200, output_tokens: 60, total_tokens: 1260 },
  };
}

const failed = (verdict) => verdict.checks.filter((c) => !c.passed).map((c) => c.name);

test("o registro bom, com o texto da ponte real, passa em todas as verificações", async () => {
  const { text, isError } = await bridgeToolText(REQUEST_ID);
  assert.equal(isError, false);
  assert.ok(!text.includes("MUST_NEVER_BE_EMITTED"), "a ponte descarta campos não previstos");
  const verdict = verifyRecord(makeRecord({ toolText: text }), { requestId: REQUEST_ID });
  assert.deepEqual(failed(verdict), []);
  assert.equal(verdict.ok, true);
});

test("o registro reduzido para gravação continua passando e não guarda campos extras", async () => {
  const { text } = await bridgeToolText(REQUEST_ID);
  const full = { ...makeRecord({ toolText: text }), metadata: { internal: "x" }, instructions: "texto do sistema" };
  const saved = redactRecord(full);
  assert.equal(verifyRecord(saved, { requestId: REQUEST_ID }).ok, true);
  assert.equal("metadata" in saved, false);
  assert.equal("instructions" in saved, false);
  assert.deepEqual(saved.usage, { input_tokens: 1200, output_tokens: 60, total_tokens: 1260 });
});

test("saída em lista de partes (formato do fluxo) também é entendida", async () => {
  const { text } = await bridgeToolText(REQUEST_ID);
  const { payload } = unwrapToolPayload([{ type: "input_text", text: JSON.stringify({ result: text }) }]);
  assert.equal(payload.environment, "synthetic-staging");
});

test("modelo que responde sem chamar a ferramenta não passa", async () => {
  const record = makeRecord({ toolText: "{}" });
  record.output = record.output.filter((i) => i.type === "message");
  const verdict = verifyRecord(record, { requestId: REQUEST_ID });
  assert.equal(verdict.ok, false);
  assert.ok(failed(verdict).includes("decisão do modelo: exatamente uma chamada de ferramenta"));
});

test("ferramenta errada, argumento errado ou argumento a mais não passam", async () => {
  const { text } = await bridgeToolText(REQUEST_ID);
  for (const bad of [
    { name: "terminal" },
    { name: "medstation_simulate_admission" }, // sem o prefixo que o Hermes usa
    { args: { requestId: "synthetic_e2e_ffffffffffff" } },
    { args: { requestId: REQUEST_ID, paciente: "x" } },
  ]) {
    assert.equal(verifyRecord(makeRecord({ toolText: text, ...bad }), { requestId: REQUEST_ID }).ok, false, JSON.stringify(bad));
  }
});

test("resposta de outra chamada (identificador diferente) não passa", async () => {
  const { text } = await bridgeToolText("synthetic_e2e_ffffffffffff");
  const verdict = verifyRecord(makeRecord({ toolText: text }), { requestId: REQUEST_ID });
  assert.ok(failed(verdict).includes("resposta da função: devolve o identificador deste teste"));
});

test("erros da ponte não passam: função desligada, sem JWT, resposta inesperada", async () => {
  const unexpected = await bridgeToolText(REQUEST_ID, { upstream: { environment: "production", simulation: {} } });
  assert.equal(unexpected.isError, true);
  for (const toolText of [
    unexpected.text,
    JSON.stringify({ error: "sandbox_not_configured" }),
    JSON.stringify({ error: "sandbox_unavailable", httpStatus: 404 }),
  ]) {
    const verdict = verifyRecord(makeRecord({ toolText }), { requestId: REQUEST_ID });
    assert.ok(failed(verdict).includes("resposta da função: sem erro da ponte"), toolText);
    assert.ok(failed(verdict).includes("resposta da função: environment = synthetic-staging"));
  }
});

test("modelo que só afirma o resultado no texto, sem resultado de ferramenta, não passa", async () => {
  const record = makeRecord({ toolText: "{}", finalText: "Deu certo: synthetic-staging, clinicus e examinus." });
  record.output = record.output.filter((i) => i.type !== "function_call_output");
  assert.equal(verifyRecord(record, { requestId: REQUEST_ID }).ok, false);
});

test("duas chamadas de ferramenta, resposta incompleta ou identificador fora do padrão não passam", async () => {
  const { text } = await bridgeToolText(REQUEST_ID);
  const twice = makeRecord({ toolText: text, extraItems: [
    { type: "function_call", status: "completed", name: WIRE_TOOL_NAME, arguments: JSON.stringify({ requestId: REQUEST_ID }), call_id: "call_2" },
    { type: "function_call_output", status: "completed", call_id: "call_2", output: JSON.stringify({ result: text }) },
  ] });
  assert.equal(verifyRecord(twice, { requestId: REQUEST_ID }).ok, false);
  assert.equal(verifyRecord({ ...makeRecord({ toolText: text }), status: "incomplete" }, { requestId: REQUEST_ID }).ok, false);
  const other = "synthetic_001";
  const { text: otherText } = await bridgeToolText(other);
  assert.equal(verifyRecord(makeRecord({ requestId: other, toolText: otherText }), { requestId: other }).ok, false);
});

test("registro com token, segredo ou dado pessoal é recusado", async () => {
  const { text } = await bridgeToolText(REQUEST_ID);
  const fakeJwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiJmaWN0aWNpbyJ9", "assinaturaficticia0000"].join(".");
  for (const leak of [fakeJwt, "Bearer abcdefgh12345678", "sk-" + "a".repeat(24), "123.456.789-09", "alguem@exemplo.com"]) {
    const verdict = verifyRecord(makeRecord({ toolText: text, finalText: `ok ${leak}` }), { requestId: REQUEST_ID });
    assert.ok(failed(verdict).includes("registro sem token, segredo ou dado pessoal"), leak);
  }
  assert.deepEqual(findForbidden(makeRecord({ toolText: text })), []);
});

// ---------------------------------------------------------------------------
// Executor contra um Hermes simulado
// ---------------------------------------------------------------------------

function run(args, env) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [EXECUTOR, ...args], {
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env }, stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (b) => { stdout += b; });
    child.stderr.on("data", (b) => { stderr += b; });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

/** Hermes + modelo simulados: "decide" chamar a ferramenta e executa a ponte real com função falsa. */
async function startFakeHermes({ misbehave = false } = {}) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (b) => { raw += b; });
    req.on("end", async () => {
      seen.push({ method: req.method, url: req.url, auth: req.headers.authorization, idem: req.headers["idempotency-key"], body: raw });
      if (req.headers.authorization !== `Bearer ${FAKE_API_KEY}`) { res.writeHead(401).end("{}"); return; }
      const body = JSON.parse(raw);
      const requestId = /synthetic_e2e_[a-f0-9]{12}/.exec(body.input)?.[0];
      const { text } = await bridgeToolText(requestId);
      const record = makeRecord({ requestId, toolText: text });
      if (misbehave) record.output = record.output.filter((i) => i.type === "message");
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(record));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, seen, close: () => new Promise((r) => server.close(r)) };
}

test("ensaio (padrão): mostra a requisição e não envia nada", async () => {
  const fake = await startFakeHermes();
  try {
    const result = await run([], { HERMES_API_URL: fake.url, HERMES_API_KEY: FAKE_API_KEY, HERMES_INFERENCIA_APROVADA: "sim" });
    assert.equal(result.code, 0);
    assert.match(result.stdout, /ENSAIO — nada foi enviado/);
    assert.match(result.stdout, /synthetic_e2e_[a-f0-9]{12}/);
    assert.ok(!result.stdout.includes(FAKE_API_KEY), "a chave não é impressa");
    assert.equal(fake.seen.length, 0);
  } finally { await fake.close(); }
});

test("sem as duas travas, sem chave ou fora do loopback: recusa sem enviar", async () => {
  const fake = await startFakeHermes();
  try {
    const noApproval = await run(["--executar"], { HERMES_API_URL: fake.url, HERMES_API_KEY: FAKE_API_KEY });
    assert.equal(noApproval.code, 2);
    assert.match(noApproval.stderr, /HERMES_INFERENCIA_APROVADA/);
    const noKey = await run(["--executar"], { HERMES_API_URL: fake.url, HERMES_INFERENCIA_APROVADA: "sim" });
    assert.equal(noKey.code, 2);
    const remote = await run(["--executar"], {
      HERMES_API_URL: "http://hermes.exemplo.invalid:8642", HERMES_API_KEY: FAKE_API_KEY, HERMES_INFERENCIA_APROVADA: "sim",
    });
    assert.equal(remote.code, 2);
    assert.match(remote.stderr, /não é loopback/);
    const halfModel = await run([], { HERMES_API_URL: fake.url, HERMES_MODEL: "modelo-x" });
    assert.equal(halfModel.code, 2);
    assert.equal(fake.seen.length, 0);
  } finally { await fake.close(); }
});

test("com as travas: uma única requisição, registro gravado sem a chave, verificação passa", async () => {
  const fake = await startFakeHermes();
  const out = mkdtempSync(join(tmpdir(), "inferencia-local-"));
  try {
    const result = await run(["--executar"], {
      HERMES_API_URL: fake.url, HERMES_API_KEY: FAKE_API_KEY, HERMES_INFERENCIA_APROVADA: "sim", OUT_DIR: out,
    });
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /RESULTADO: passou/);
    assert.equal(fake.seen.length, 1, "uma única requisição");
    assert.equal(fake.seen[0].method, "POST");
    assert.equal(fake.seen[0].url, "/v1/responses");
    assert.match(fake.seen[0].idem, /^synthetic_e2e_[a-f0-9]{12}$/);
    const sent = JSON.parse(fake.seen[0].body);
    assert.deepEqual(Object.keys(sent).sort(), ["input", "instructions", "model"]);
    assert.deepEqual(findForbidden(sent), []);
    const files = readdirSync(out);
    assert.equal(files.length, 1);
    const savedText = readFileSync(join(out, files[0]), "utf8");
    assert.ok(!savedText.includes(FAKE_API_KEY), "a chave não vai para o arquivo");
    assert.ok(!result.stdout.includes(FAKE_API_KEY) && !result.stderr.includes(FAKE_API_KEY));
    const saved = JSON.parse(savedText);
    assert.equal(saved.resultado, "passou");
    assert.equal(saved.httpStatus, 200);
    assert.equal(verifyRecord(saved.registro, { requestId: saved.requestId }).ok, true);
  } finally { await fake.close(); rmSync(out, { recursive: true, force: true }); }
});

test("se o modelo não chamar a ferramenta, o executor termina em falha e grava o motivo", async () => {
  const fake = await startFakeHermes({ misbehave: true });
  const out = mkdtempSync(join(tmpdir(), "inferencia-local-"));
  try {
    const result = await run(["--executar"], {
      HERMES_API_URL: fake.url, HERMES_API_KEY: FAKE_API_KEY, HERMES_INFERENCIA_APROVADA: "sim", OUT_DIR: out,
    });
    assert.equal(result.code, 1);
    assert.match(result.stdout, /RESULTADO: falhou/);
    assert.equal(fake.seen.length, 1, "não repete a chamada");
    assert.equal(JSON.parse(readFileSync(join(out, readdirSync(out)[0]), "utf8")).resultado, "falhou");
  } finally { await fake.close(); rmSync(out, { recursive: true, force: true }); }
});

test("chave errada no Hermes: falha sem repetir", async () => {
  const fake = await startFakeHermes();
  const out = mkdtempSync(join(tmpdir(), "inferencia-local-"));
  try {
    const result = await run(["--executar"], {
      HERMES_API_URL: fake.url, HERMES_API_KEY: "outra-chave-ficticia", HERMES_INFERENCIA_APROVADA: "sim", OUT_DIR: out,
    });
    assert.equal(result.code, 1);
    assert.equal(fake.seen.length, 1);
    assert.equal(JSON.parse(readFileSync(join(out, readdirSync(out)[0]), "utf8")).httpStatus, 401);
  } finally { await fake.close(); rmSync(out, { recursive: true, force: true }); }
});
