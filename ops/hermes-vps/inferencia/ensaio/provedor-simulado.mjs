/**
 * Provedor de modelo SIMULADO, só para o ensaio local. Escrito pelo Claude em
 * 24/11/2026. Não é um modelo: devolve respostas fixas no formato
 * OpenAI-compatível (/v1/chat/completions), em loopback.
 *
 * Modos (PROVEDOR_MODO):
 *   normal  1ª chamada: pede a ferramenta; 2ª em diante: resposta final
 *   repete  toda chamada pede a ferramenta de novo
 *   erro    1ª chamada: HTTP 500; depois, como o modo normal
 *
 * Registra uma linha por pedido em PROVEDOR_REGISTRO: número, se a chave
 * conferiu, se era fluxo, os NOMES das ferramentas que o Hermes ofereceu, os
 * papéis das mensagens e se já havia resultado de ferramenta. Nunca o corpo.
 *
 * Ao subir, imprime {"provedor":"pronto","porta":N}.
 */
import http from "node:http";
import { appendFileSync } from "node:fs";

const mode = process.env.PROVEDOR_MODO ?? "normal";
const expectedKey = process.env.PROVEDOR_CHAVE_ESPERADA ?? "";
const logFile = process.env.PROVEDOR_REGISTRO;
const MODEL = "google/gemini-3-flash-preview";
const TOOL_SUFFIX = "medstation_simulate_admission";
let calls = 0;

const log = (entry) => { if (logFile) appendFileSync(logFile, JSON.stringify(entry) + "\n"); };
const textOf = (content) => typeof content === "string"
  ? content
  : Array.isArray(content) ? content.map((p) => (typeof p?.text === "string" ? p.text : "")).join("") : "";

function completion({ toolCall, text }) {
  const message = toolCall
    ? { role: "assistant", content: null, tool_calls: [{ id: toolCall.id, type: "function", function: { name: toolCall.name, arguments: toolCall.arguments } }] }
    : { role: "assistant", content: text };
  return {
    id: `chatcmpl-ensaio-${calls}`, object: "chat.completion", created: Math.floor(Date.now() / 1000), model: MODEL,
    choices: [{ index: 0, message, finish_reason: toolCall ? "tool_calls" : "stop" }],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
  };
}

function sendStream(res, { toolCall, text }, includeUsage) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  const base = { id: `chatcmpl-ensaio-${calls}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: MODEL };
  const chunk = (delta, finish = null) => res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
  if (toolCall) {
    chunk({ role: "assistant", content: null, tool_calls: [{ index: 0, id: toolCall.id, type: "function", function: { name: toolCall.name, arguments: "" } }] });
    chunk({ tool_calls: [{ index: 0, function: { arguments: toolCall.arguments } }] });
    chunk({}, "tool_calls");
  } else {
    chunk({ role: "assistant", content: text });
    chunk({}, "stop");
  }
  if (includeUsage) {
    res.write(`data: ${JSON.stringify({ ...base, choices: [], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } })}\n\n`);
  }
  res.end("data: [DONE]\n\n");
}

const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (b) => { raw += b; });
  req.on("end", () => {
    const authOk = !expectedKey || req.headers.authorization === `Bearer ${expectedKey}`;
    const path = (req.url ?? "").split("?")[0];
    if (req.method === "GET" && path.endsWith("/models")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ object: "list", data: [{ id: MODEL, object: "model", context_length: 1048576 }] }));
    }
    if (req.method !== "POST" || !path.endsWith("/chat/completions")) {
      log({ pedido: "fora do previsto", metodo: req.method, caminho: path });
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "rota não simulada" } }));
    }
    calls += 1;
    let body = {};
    try { body = JSON.parse(raw); } catch { /* corpo ilegível: registra e responde 400 abaixo */ }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const offered = Array.isArray(body.tools) ? body.tools.map((t) => t?.function?.name ?? t?.name ?? "?") : [];
    const toolName = offered.find((n) => typeof n === "string" && n.endsWith(TOOL_SUFFIX));
    const requestId = /synthetic_e2e_[a-f0-9]{12}/.exec(messages.map((m) => textOf(m?.content)).join("\n"))?.[0];
    const toolResults = messages.filter((m) => m?.role === "tool");
    const entry = {
      chamada: calls, chaveConfere: authOk, fluxo: body.stream === true, modeloPedido: body.model,
      ferramentasOferecidas: offered, papeis: messages.map((m) => m?.role),
      resultadosDeFerramentaRecebidos: toolResults.length,
      resultadoTemSyntheticStaging: toolResults.some((m) => textOf(m.content).includes("synthetic-staging")),
    };
    if (!authOk) {
      log({ ...entry, acao: "401" });
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "chave do provedor simulado não confere", code: 401 } }));
    }
    if (mode === "erro" && calls === 1) {
      log({ ...entry, acao: "500" });
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "falha simulada do provedor", code: 500 } }));
    }
    const sequence = mode === "erro" ? calls - 1 : calls;
    const askTool = mode === "repete" || sequence === 1;
    if (askTool && (!toolName || !requestId)) {
      log({ ...entry, acao: "sem ferramenta ou sem identificador" });
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "a ferramenta da MedStation não foi oferecida ou falta o identificador" } }));
    }
    const answer = askTool
      ? { toolCall: { id: `call_ensaio_${calls}`, name: toolName, arguments: JSON.stringify({ requestId }) } }
      : { text: "Ambiente synthetic-staging; etapas clinicus e examinus simuladas." };
    log({ ...entry, acao: askTool ? "pediu a ferramenta" : "resposta final" });
    if (body.stream === true) return sendStream(res, answer, body.stream_options?.include_usage === true);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(completion(answer)));
  });
});

server.listen(Number.parseInt(process.env.PROVEDOR_PORTA ?? "0", 10), "127.0.0.1", () => {
  console.log(JSON.stringify({ provedor: "pronto", porta: server.address().port, modo: mode }));
});
const stop = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 500).unref(); };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
