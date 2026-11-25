/**
 * Limitador local de chamadas ao modelo. Escrito pelo Claude em 24/11/2026.
 *
 * Fica entre o Hermes e o provedor, só em loopback. Faz três coisas:
 *   1. conta cada tentativa de chamada ao modelo e deixa passar no máximo
 *      LIMITADOR_MAX_CHAMADAS; a seguinte é recusada AQUI, com 402, sem sair
 *      deste processo;
 *   2. guarda a chave do provedor: o Hermes fala com o limitador usando uma
 *      chave local qualquer, e só o limitador põe a chave de verdade no pedido;
 *   3. registra uma linha por tentativa (método, caminho, ação, status), sem
 *      corpo, sem cabeçalho e sem chave.
 *
 * Toda requisição que não seja GET conta, tenha dado certo ou não: uma
 * tentativa que falha no provedor também pode ser cobrada.
 *
 * Variáveis:
 *   LIMITADOR_PORTA          porta em 127.0.0.1 (0 = escolhe uma livre)
 *   LIMITADOR_DESTINO        base do provedor, ex.: https://openrouter.ai/api/v1
 *   LIMITADOR_MAX_CHAMADAS   padrão 2
 *   LIMITADOR_CHAVE_DESTINO  chave do provedor (só no ambiente deste processo)
 *   LIMITADOR_CHAVE_LOCAL    opcional: chave que o Hermes precisa apresentar
 *   LIMITADOR_REGISTRO       opcional: arquivo para as linhas de registro
 *
 * Ao subir, imprime uma linha JSON com a porta: {"limitador":"pronto","porta":N}
 */
import http from "node:http";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Readable } from "node:stream";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function parseDestination(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("LIMITADOR_DESTINO inválido"); }
  const loopback = LOOPBACK.has(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("LIMITADOR_DESTINO precisa ser https (http só em loopback)");
  }
  if (url.username || url.password || url.search || url.hash) throw new Error("LIMITADOR_DESTINO não pode ter credenciais, consulta ou fragmento");
  return url.href.replace(/\/+$/, "");
}

export function createLimiter({ destination, upstreamKey, localKey = "", maxCalls = 2, log = () => {}, fetchImpl = fetch }) {
  const base = parseDestination(destination);
  if (!upstreamKey) throw new Error("falta a chave do destino");
  if (!Number.isInteger(maxCalls) || maxCalls < 0) throw new Error("máximo de chamadas inválido");
  const state = { attempts: 0, forwarded: 0, blocked: 0 };

  const handler = async (req, res) => {
    const path = (req.url ?? "/").replace(/^\/v1(?=\/|$)/, "") || "/";
    const record = (action, status) => log({
      n: state.attempts, hora: new Date().toISOString(), metodo: req.method, caminho: path.split("?")[0], acao: action, status,
    });
    const reply = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    if (localKey && req.headers.authorization !== `Bearer ${localKey}`) {
      req.resume();
      return reply(401, { error: { message: "chave local inválida", code: "local_unauthorized" } });
    }

    const counted = req.method !== "GET" && req.method !== "HEAD";
    if (counted) {
      state.attempts += 1;
      if (state.forwarded >= maxCalls) {
        state.blocked += 1;
        req.resume();
        record("bloqueada", 402);
        // 402: o Hermes trata como falta de crédito e não repete.
        return reply(402, {
          error: {
            message: `limite local de ${maxCalls} chamadas ao modelo atingido; pedido não enviado ao provedor`,
            code: "insufficient_credits", type: "local_call_limit",
          },
        });
      }
      state.forwarded += 1;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    let upstream;
    try {
      upstream = await fetchImpl(base + path, {
        method: req.method,
        headers: {
          Authorization: `Bearer ${upstreamKey}`,
          ...(req.headers["content-type"] ? { "Content-Type": req.headers["content-type"] } : {}),
          ...(req.headers.accept ? { Accept: req.headers.accept } : {}),
        },
        body: counted ? body : undefined,
        redirect: "error",
      });
    } catch {
      if (counted) record("encaminhada", "sem resposta");
      return reply(502, { error: { message: "provedor não respondeu", code: "upstream_unreachable" } });
    }
    if (counted) record("encaminhada", upstream.status);
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    });
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body).on("error", () => res.end()).pipe(res);
  };

  return { handler, state, destination: base };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const logFile = process.env.LIMITADOR_REGISTRO;
  const limiter = createLimiter({
    destination: process.env.LIMITADOR_DESTINO ?? "",
    upstreamKey: process.env.LIMITADOR_CHAVE_DESTINO ?? "",
    localKey: process.env.LIMITADOR_CHAVE_LOCAL ?? "",
    maxCalls: Number.parseInt(process.env.LIMITADOR_MAX_CHAMADAS ?? "2", 10),
    log: (entry) => { if (logFile) appendFileSync(logFile, JSON.stringify(entry) + "\n", { mode: 0o600 }); },
  });
  const server = http.createServer((req, res) => {
    limiter.handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  // Só loopback: o limitador nunca escuta em interface externa.
  server.listen(Number.parseInt(process.env.LIMITADOR_PORTA ?? "0", 10), "127.0.0.1", () => {
    console.log(JSON.stringify({ limitador: "pronto", porta: server.address().port, destino: new URL(limiter.destination).host }));
  });
  const stop = () => {
    console.log(JSON.stringify({ limitador: "encerrado", ...limiter.state }));
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
