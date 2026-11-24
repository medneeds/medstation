/**
 * Verificador do registro do teste de inferência do Hermes (nível C).
 * Escrito pelo Claude em 24/11/2026. Módulo puro: não usa rede.
 *
 * O "registro" é a resposta JSON de um único `POST /v1/responses` do Hermes.
 * Na versão fixada (v0.23.1, gateway/platforms/api_server_openai_routes.py) ela
 * traz, na ordem, em `output`:
 *   function_call         — o que o MODELO decidiu chamar (nome + argumentos)
 *   function_call_output  — o que a ferramenta devolveu, executada pelo Hermes
 *   message               — a resposta final do modelo
 * O verificador exige que as três coisas estejam nesse mesmo JSON e amarradas
 * pelo mesmo `call_id` e pelo mesmo `requestId` gerado na hora do teste.
 *
 * Uso: node verificar-registro.mjs <registro.json> <requestId>
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** Nome com que o Hermes v0.23.1 apresenta a ferramenta ao modelo: mcp__<servidor>__<ferramenta>. */
export const WIRE_TOOL_NAME = "mcp__medstation_sandbox__medstation_simulate_admission";
export const REQUEST_ID_RE = /^synthetic_e2e_[a-f0-9]{12}$/;
const EXPECTED_STEPS = [
  { tool: "clinical.document", target: "clinicus", status: "simulated" },
  { tool: "clinical.labs", target: "examinus", status: "simulated" },
];

/** Padrões que nunca podem aparecer num registro salvo. */
const FORBIDDEN = [
  ["JWT", /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ["cabeçalho Bearer", /Bearer\s+[A-Za-z0-9._-]{8,}/i],
  ["chave de provedor", /\b(sk|rk|pk)[-_][A-Za-z0-9_-]{16,}/],
  ["chave Supabase", /\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}/],
  ["segredo de webhook", /\bwhsec_[A-Za-z0-9]{8,}/],
  ["hex de 64 (chave da API)", /\b[0-9a-f]{64}\b/],
  ["CPF", /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/],
  ["e-mail", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
];

function parseJson(text) {
  try { return JSON.parse(text); } catch { return undefined; }
}

/** Texto de um `output` de ferramenta: string (resposta única) ou lista de partes (fluxo). */
function outputText(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
  return "";
}

/**
 * O Hermes embrulha o texto de uma ferramenta MCP em {"result": "<texto>"};
 * a ponte da MedStation devolve o JSON dela como texto. Aceita os dois níveis.
 */
export function unwrapToolPayload(output) {
  const outer = parseJson(outputText(output));
  if (!outer || typeof outer !== "object") return { payload: undefined, error: "saída não é JSON" };
  if (typeof outer.error === "string" && !("result" in outer)) return { payload: undefined, error: outer.error };
  if (typeof outer.result === "string") {
    const inner = parseJson(outer.result);
    return inner && typeof inner === "object"
      ? { payload: inner, error: typeof inner.error === "string" ? inner.error : undefined }
      : { payload: undefined, error: "campo result não é JSON" };
  }
  if (outer.result && typeof outer.result === "object") return { payload: outer.result };
  return { payload: outer, error: typeof outer.error === "string" ? outer.error : undefined };
}

function messageText(item) {
  if (!item || !Array.isArray(item.content)) return "";
  return item.content.map((c) => (typeof c?.text === "string" ? c.text : "")).join("").trim();
}

export function findForbidden(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return FORBIDDEN.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** Só os campos que servem de evidência; todo o resto é descartado antes de gravar. */
export function redactRecord(record) {
  const keepItem = (item) => {
    const base = { type: item?.type, status: item?.status };
    if (item?.type === "function_call") {
      return { ...base, name: item.name, arguments: item.arguments, call_id: item.call_id };
    }
    if (item?.type === "function_call_output") {
      return { ...base, call_id: item.call_id, output: outputText(item.output) };
    }
    if (item?.type === "message") {
      return { ...base, role: item.role, content: [{ type: "output_text", text: messageText(item) }] };
    }
    return base; // ex.: raciocínio — fica só o tipo
  };
  return {
    id: record?.id,
    object: record?.object,
    status: record?.status,
    model: record?.model,
    output: Array.isArray(record?.output) ? record.output.map(keepItem) : [],
    usage: record?.usage && typeof record.usage === "object"
      ? {
        input_tokens: record.usage.input_tokens,
        output_tokens: record.usage.output_tokens,
        total_tokens: record.usage.total_tokens,
      }
      : undefined,
  };
}

/**
 * Confere um registro contra o `requestId` gerado para este teste.
 * Devolve { ok, checks: [{ name, passed, detail }] }.
 */
export function verifyRecord(record, { requestId }) {
  const checks = [];
  const add = (name, passed, detail = "") => checks.push({ name, passed: Boolean(passed), detail });

  add("identificador do teste no formato esperado", REQUEST_ID_RE.test(requestId ?? ""), String(requestId));
  add("resposta concluída", record?.object === "response" && record?.status === "completed",
    `object=${record?.object} status=${record?.status}`);

  const output = Array.isArray(record?.output) ? record.output : [];
  const calls = output.filter((i) => i?.type === "function_call");
  const outputs = output.filter((i) => i?.type === "function_call_output");
  const messages = output.filter((i) => i?.type === "message");
  const call = calls[0];
  const callIndex = output.indexOf(call);

  // 1) decisão do modelo
  add("decisão do modelo: exatamente uma chamada de ferramenta", calls.length === 1, `chamadas=${calls.length}`);
  add("decisão do modelo: a ferramenta escolhida é a da MedStation", call?.name === WIRE_TOOL_NAME, String(call?.name));
  const args = parseJson(typeof call?.arguments === "string" ? call.arguments : JSON.stringify(call?.arguments ?? null));
  add("decisão do modelo: o único argumento é o identificador deste teste",
    args && typeof args === "object" && Object.keys(args).length === 1 && args.requestId === requestId,
    args ? `chaves=${Object.keys(args).join(",")}` : "argumentos ilegíveis");

  // 2) chamada da ferramenta
  const result = outputs.find((o) => call && o?.call_id && o.call_id === call.call_id);
  const resultIndex = output.indexOf(result);
  add("chamada da ferramenta: há um resultado com o mesmo call_id, depois da chamada",
    Boolean(result) && resultIndex > callIndex && outputs.length === 1,
    `resultados=${outputs.length}`);
  add("chamada da ferramenta: execução concluída", result?.status === "completed", String(result?.status));

  // 3) resposta da função da homologação
  const { payload, error } = result ? unwrapToolPayload(result.output) : { payload: undefined, error: "sem resultado" };
  add("resposta da função: sem erro da ponte", !error && Boolean(payload), error ? `erro=${error}` : "");
  add("resposta da função: environment = synthetic-staging", payload?.environment === "synthetic-staging",
    String(payload?.environment));
  const sim = payload?.simulation;
  add("resposta da função: devolve o identificador deste teste", sim?.requestId === requestId, String(sim?.requestId));
  add("resposta da função: simulação de admissão com revisão médica obrigatória",
    sim?.ok === true && sim?.mode === "simulation" && sim?.workflow === "admission-review" &&
    sim?.requiresMedicalReview === true);
  add("resposta da função: as duas etapas simuladas (clinicus, examinus)",
    Array.isArray(sim?.steps) && sim.steps.length === 2 && sim.steps.every((s, i) =>
      s?.tool === EXPECTED_STEPS[i].tool && s?.target === EXPECTED_STEPS[i].target &&
      s?.status === EXPECTED_STEPS[i].status));

  // 4) fecho e higiene
  const final = messages[messages.length - 1];
  add("resposta final do modelo vem depois do resultado da ferramenta",
    Boolean(final) && output.indexOf(final) > resultIndex && resultIndex >= 0 && messageText(final).length > 0);
  const forbidden = findForbidden(record ?? {});
  add("registro sem token, segredo ou dado pessoal", forbidden.length === 0, forbidden.join(", "));

  return { ok: checks.every((c) => c.passed), checks };
}

export function formatChecks(checks) {
  return checks
    .map((c) => `${c.passed ? "passou  " : "FALHOU  "} ${c.name}${c.detail && !c.passed ? "  [" + c.detail + "]" : ""}`)
    .join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [file, requestId] = process.argv.slice(2);
  if (!file || !requestId) {
    console.error("uso: node verificar-registro.mjs <registro.json> <requestId>");
    process.exit(2);
  }
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const verdict = verifyRecord(saved.registro ?? saved, { requestId });
  console.log(formatChecks(verdict.checks));
  console.log(verdict.ok ? "\nRESULTADO: passou" : "\nRESULTADO: falhou");
  process.exit(verdict.ok ? 0 : 1);
}
