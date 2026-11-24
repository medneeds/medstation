/**
 * Teste de inferência do Hermes (nível C): UMA chamada, UM cenário sintético.
 * Escrito pelo Claude em 24/11/2026. NÃO EXECUTADO contra o Hermes real.
 *
 * Por padrão só mostra o que seria enviado (ensaio, sem rede).
 * Só envia de verdade com as duas travas ao mesmo tempo:
 *   --executar                       na linha de comando
 *   HERMES_INFERENCIA_APROVADA=sim   no ambiente
 * e só para um endereço de loopback (o túnel SSH).
 *
 * Variáveis:
 *   HERMES_API_URL    padrão http://127.0.0.1:18642
 *   HERMES_API_KEY    chave da API do Hermes (nunca é impressa nem gravada)
 *   HERMES_PROVIDER / HERMES_MODEL   opcionais, os dois juntos: escolhem o
 *                     modelo só para esta requisição
 *   OUT_DIR           onde gravar o registro (padrão: pasta temporária)
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findForbidden, formatChecks, redactRecord, verifyRecord } from "./verificar-registro.mjs";

const execute = process.argv.includes("--executar");
const apiUrl = (process.env.HERMES_API_URL ?? "http://127.0.0.1:18642").replace(/\/+$/, "");
const apiKey = process.env.HERMES_API_KEY ?? "";
const provider = (process.env.HERMES_PROVIDER ?? "").trim();
const model = (process.env.HERMES_MODEL ?? "").trim();
const outDir = process.env.OUT_DIR ?? join(tmpdir(), "medstation-teste-inferencia");

const requestId = `synthetic_e2e_${randomBytes(6).toString("hex")}`;

// Cenário único. Nenhum dado de paciente: só o identificador sintético.
const body = {
  model: provider && model ? model : "hermes-agent",
  ...(provider && model ? { provider } : {}),
  instructions:
    "Teste de homologação com dados sintéticos. Não há paciente. " +
    "Não invente resultado: se a ferramenta falhar ou não existir, diga apenas que falhou.",
  input:
    `Rode a simulação sintética de admissão da MedStation para o identificador ${requestId}. ` +
    "Use a ferramenta disponível uma única vez e responda em uma frase com o ambiente e as etapas que ela devolveu.",
};

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

if ((provider && !model) || (!provider && model)) fail("defina HERMES_PROVIDER e HERMES_MODEL juntos, ou nenhum dos dois");
const leaks = findForbidden(body);
if (leaks.length) fail(`o corpo da requisição contém algo proibido: ${leaks.join(", ")}`);

let target;
try { target = new URL(`${apiUrl}/v1/responses`); } catch { fail("HERMES_API_URL inválida"); }
const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname);

if (!execute) {
  console.log("ENSAIO — nada foi enviado.\n");
  console.log(`POST ${target.href}`);
  console.log("Authorization: Bearer <HERMES_API_KEY, não exibida>");
  console.log(`Idempotency-Key: ${requestId}`);
  console.log(JSON.stringify(body, null, 2));
  console.log("\nPara enviar de verdade: --executar e HERMES_INFERENCIA_APROVADA=sim, com o túnel aberto.");
  process.exit(0);
}

if (process.env.HERMES_INFERENCIA_APROVADA !== "sim") fail("recusado: falta HERMES_INFERENCIA_APROVADA=sim (aprovação do Artur)");
if (!loopback) fail(`recusado: ${target.hostname} não é loopback; use o túnel SSH`);
if (!apiKey) fail("recusado: falta HERMES_API_KEY");

const startedAt = new Date().toISOString();
let response;
try {
  // Uma tentativa, sem repetição: repetir poderia gerar uma segunda chamada paga.
  response = await fetch(target, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": requestId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
    redirect: "error",
  });
} catch (error) {
  fail(`falhou: sem resposta do Hermes (${error?.name ?? "erro"})`, 1);
}
const finishedAt = new Date().toISOString();
const raw = await response.text();
let record;
try { record = JSON.parse(raw); } catch { record = null; }

const registro = record ? redactRecord(record) : null;
const verdict = registro && response.status === 200
  ? verifyRecord(registro, { requestId })
  : { ok: false, checks: [{ name: "resposta HTTP 200 com JSON", passed: false, detail: `HTTP ${response.status}` }] };

mkdirSync(outDir, { recursive: true });
const file = join(outDir, `registro-${requestId}.json`);
writeFileSync(file, JSON.stringify({
  teste: "hermes-inferencia-nivel-c",
  requestId,
  inicio: startedAt,
  fim: finishedAt,
  httpStatus: response.status,
  modeloPedido: body.model,
  provedorPedido: body.provider ?? "(padrão do Hermes)",
  resultado: verdict.ok ? "passou" : "falhou",
  verificacoes: verdict.checks,
  registro,
}, null, 2), { mode: 0o600 });

console.log(`requestId: ${requestId}`);
console.log(`início: ${startedAt}  fim: ${finishedAt}  HTTP ${response.status}`);
if (registro?.usage) console.log(`tokens: entrada ${registro.usage.input_tokens}, saída ${registro.usage.output_tokens}`);
console.log(formatChecks(verdict.checks));
console.log(`\nregistro gravado em ${file}`);
console.log(verdict.ok ? "RESULTADO: passou" : "RESULTADO: falhou");
process.exit(verdict.ok ? 0 : 1);
