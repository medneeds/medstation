/**
 * Ensaio LOCAL do teste de inferência, com o Hermes de verdade e todo o resto
 * simulado em loopback. Escrito pelo Claude em 24/11/2026.
 *
 *   Hermes real (instância temporária, HERMES_HOME descartável)
 *     ├─ modelo:  limitador-modelo.mjs  ->  provedor-simulado.mjs
 *     └─ ferramenta: ponte real (hermes-bridge/server.mjs) com a função da
 *                    homologação trocada por funcao-simulada.mjs
 *
 * Nenhuma credencial real, nenhum provedor real, nenhuma rede externa.
 * Todas as chaves abaixo são sorteadas na hora e só existem no ambiente dos
 * processos; ao fim, o ensaio procura cada uma delas em disco.
 *
 * Uso:
 *   HERMES_BIN=<lançador do hermes> node ops/hermes-vps/inferencia/ensaio/rodar-ensaio-local.mjs [cenários...]
 * Cenários: normal, repete, erro, coexistencia (padrão: os quatro).
 *   coexistencia: sobe um gateway que faz o papel do "serviço existente" e tenta subir a
 *   instância temporária ao lado dele, com e sem estado isolado.
 * Opcional: ENSAIO_HOME=<HOME dos processos>, HERMES_INSTALACAO=<pasta da instalação, para
 *           conferir que ela não muda>, OUT_DIR=<pasta de saída>, ENSAIO_MANTER=1
 */
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WIRE_TOOL_NAME, verifyRecord } from "../verificar-registro.mjs";
// Atenção: não importar funcao-simulada.mjs aqui — ela troca o fetch global deste processo.
import { ENSAIO } from "./constantes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const hermesBin = process.env.HERMES_BIN;
if (!hermesBin || !existsSync(hermesBin)) {
  console.error("bloqueado: defina HERMES_BIN com o lançador do Hermes instalado localmente");
  process.exit(2);
}
const home = process.env.ENSAIO_HOME ?? process.env.HOME;
const ownerHome = process.env.HERMES_INSTALACAO ?? join(home, ".hermes");
const outRoot = process.env.OUT_DIR ?? mkdtempSync(join(tmpdir(), "ensaio-hermes-"));
mkdirSync(outRoot, { recursive: true });
const scenarios = process.argv.slice(2).length ? process.argv.slice(2) : ["normal", "repete", "erro", "coexistencia"];
const MAX_CALLS = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const sha = (file) => (existsSync(file) ? createHash("sha256").update(readFileSync(file)).digest("hex") : "(ausente)");
const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.once("error", rej);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); });
});

function walk(dir, visit, depth = 0) {
  if (depth > 12) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(p, visit, depth + 1);
    else if (e.isFile()) visit(p);
  }
}

/** Arquivos sob `roots` que contêm algum dos segredos (procura em bytes). */
function findSecrets(roots, secrets, { skip = [] } = {}) {
  const hits = [];
  for (const root of roots) {
    walk(root, (file) => {
      if (root !== file && skip.some((s) => !root.startsWith(s) && file.startsWith(s))) return;
      let size;
      try { size = statSync(file).size; } catch { return; }
      if (size === 0 || size > 64 * 1024 * 1024) return;
      let data;
      try { data = readFileSync(file); } catch { return; }
      for (const [name, value] of Object.entries(secrets)) {
        if (data.includes(value)) hits.push({ segredo: name, arquivo: file.replace(root, root === ownerHome ? "<instalação>" : "<temporária>") });
      }
    });
  }
  return hits;
}

/** Pastas hermes-gw-* que o gateway cria no diretório temporário do sistema (soquete de controle). */
const controlDirs = () => {
  try { return readdirSync("/tmp").filter((n) => n.startsWith("hermes-gw-")).map((n) => join("/tmp", n)); } catch { return []; }
};

function changedSince(root, sinceMs, skip) {
  const changed = [];
  walk(root, (file) => {
    if (skip.some((s) => file.startsWith(s))) return;
    try { if (statSync(file).mtimeMs > sinceMs) changed.push(file.replace(root, "")); } catch { /* sumiu */ }
  });
  return changed;
}

/** Sobe um processo auxiliar que anuncia a porta numa linha JSON. */
function startHelper(script, env, key) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [script], { env: { PATH: process.env.PATH, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    const timer = setTimeout(() => rej(new Error(`${key} não subiu`)), 10000);
    child.stdout.on("data", (b) => {
      buf += b;
      const line = buf.split("\n").find((l) => l.includes(`"${key}":"pronto"`));
      if (line) { clearTimeout(timer); res({ child, port: JSON.parse(line).porta }); }
    });
    child.on("error", rej);
  });
}

const stop = (child, signal = "SIGTERM") => new Promise((res) => {
  if (!child || child.exitCode !== null) return res();
  const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* já saiu */ } }, 15000);
  child.once("close", () => { clearTimeout(timer); res(); });
  try { child.kill(signal); } catch { clearTimeout(timer); res(); }
});

function configYaml({ limiterPort, functionLog }) {
  const bridge = join(repo, "hermes-bridge", "server.mjs");
  const preload = join(here, "funcao-simulada.mjs");
  return `# Configuração DESCARTÁVEL do ensaio local. Nenhum segredo neste arquivo.
model:
  default: "google/gemini-3-flash-preview"
  provider: custom
  base_url: "http://127.0.0.1:${limiterPort}/v1"
  key_env: ENSAIO_CHAVE_LOCAL_DO_PROVEDOR
agent:
  max_turns: 2
  api_max_retries: 1
  disabled_toolsets: [terminal, file, browser, code_execution, delegation, web, search, x_search, computer_use, cronjob, memory, skills, session_search, connections, image_gen, video_gen, vision, video, tts, kanban, project, debugging, coding, safe]
auxiliary:
  title_generation:
    enabled: false
platform_toolsets:
  api_server: [medstation_sandbox]
  cli: [medstation_sandbox]
# Sem isto o Hermes esconde a ferramenta MCP atrás de tool_search/tool_describe/tool_call
# (padrão "auto"), o que custa uma ou duas chamadas a mais ao modelo.
tools:
  tool_search:
    enabled: ${process.env.ENSAIO_TOOL_SEARCH ?? "off"}
mcp_servers:
  medstation_sandbox:
    command: "${process.execPath}"
    args: ["--import", "${preload}", "${bridge}"]
    env:
      MEDSTATION_MCP_STAGING_ENABLED: "\${MEDSTATION_MCP_STAGING_ENABLED}"
      MEDSTATION_STAGING_PROJECT_REF: "\${MEDSTATION_STAGING_PROJECT_REF}"
      MEDSTATION_PRODUCTION_PROJECT_REF: "\${MEDSTATION_PRODUCTION_PROJECT_REF}"
      MEDSTATION_STAGING_URL: "\${MEDSTATION_STAGING_URL}"
      MEDSTATION_STAGING_JWT: "\${MEDSTATION_STAGING_JWT}"
      MEDSTATION_SUPABASE_ANON_KEY: "\${MEDSTATION_SUPABASE_ANON_KEY}"
      ENSAIO_FUNCAO_REGISTRO: "${functionLog}"
    enabled: true
    trust: untrusted
    supports_parallel_tool_calls: false
    tools:
      include: ["medstation_simulate_admission"]
      resources: false
      prompts: false
`;
}

async function waitHealth(port, child, seconds) {
  const deadline = Date.now() + seconds * 1000;
  let last = "sem tentativa";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return { ok: false, reason: `o Hermes saiu com código ${child.exitCode}` };
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(3000) });
      if (r.status === 200) return { ok: true, health: await r.json() };
      last = `HTTP ${r.status}`;
    } catch (e) { last = e?.cause?.code ?? e?.name ?? "erro"; }
    await sleep(500);
  }
  return { ok: false, reason: `o Hermes não respondeu em /health em ${seconds}s (porta ${port}; último erro: ${last})` };
}

async function runScenario(mode) {
  const dir = join(outRoot, mode);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const tempHome = mkdtempSync(join(dir, "hermes-home-"));
  const logs = { provider: join(dir, "provedor.jsonl"), limiter: join(dir, "limitador.jsonl"), fn: join(dir, "funcao.jsonl") };
  // Segredos FICTÍCIOS, sorteados agora. Só vão para o ambiente dos processos.
  const secrets = {
    "chave da API do Hermes": `ensaio-api-${randomBytes(16).toString("hex")}`,
    "chave local do provedor": `ensaio-local-${randomBytes(16).toString("hex")}`,
    "chave do provedor (só o limitador tem)": `ensaio-destino-${randomBytes(16).toString("hex")}`,
    "JWT fictício da ponte": ENSAIO.jwt,
  };
  const result = { cenario: mode, checks: [] };
  const check = (name, ok, detail = "") => {
    result.checks.push({ name, passed: Boolean(ok), detail: String(detail) });
    console.log(`${ok ? "passou  " : "FALHOU  "} [${mode}] ${name}${detail !== "" ? "  " + detail : ""}`);
  };

  const controlBefore = new Set(controlDirs());
  let provider; let limiter; let hermes;
  try {
    provider = await startHelper(join(here, "provedor-simulado.mjs"), {
      PROVEDOR_MODO: mode, PROVEDOR_CHAVE_ESPERADA: secrets["chave do provedor (só o limitador tem)"], PROVEDOR_REGISTRO: logs.provider,
    }, "provedor");
    limiter = await startHelper(join(here, "..", "limitador-modelo.mjs"), {
      LIMITADOR_DESTINO: `http://127.0.0.1:${provider.port}/v1`, LIMITADOR_MAX_CHAMADAS: String(MAX_CALLS),
      LIMITADOR_CHAVE_DESTINO: secrets["chave do provedor (só o limitador tem)"],
      LIMITADOR_CHAVE_LOCAL: secrets["chave local do provedor"], LIMITADOR_REGISTRO: logs.limiter,
    }, "limitador");

    writeFileSync(join(tempHome, "config.yaml"), configYaml({ limiterPort: limiter.port, functionLog: logs.fn }));
    const apiPort = await freePort();
    const hermesLog = join(dir, "hermes-saida.log");
    hermes = spawn(hermesBin, ["gateway", "run"], {
      cwd: tempHome,
      env: {
        HOME: home, PATH: process.env.PATH, LANG: "en_US.UTF-8", NO_COLOR: "1",
        HERMES_HOME: tempHome, HERMES_DISABLE_LAZY_INSTALLS: "1",
        API_SERVER_ENABLED: "true", API_SERVER_HOST: "127.0.0.1", API_SERVER_PORT: String(apiPort),
        API_SERVER_KEY: secrets["chave da API do Hermes"],
        ENSAIO_CHAVE_LOCAL_DO_PROVEDOR: secrets["chave local do provedor"],
        MEDSTATION_MCP_STAGING_ENABLED: "true",
        MEDSTATION_STAGING_PROJECT_REF: ENSAIO.stagingRef,
        MEDSTATION_PRODUCTION_PROJECT_REF: ENSAIO.productionRef,
        MEDSTATION_STAGING_URL: ENSAIO.url,
        MEDSTATION_STAGING_JWT: ENSAIO.jwt,
        MEDSTATION_SUPABASE_ANON_KEY: ENSAIO.anonKey,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let hermesOut = "";
    hermes.stdout.on("data", (b) => { hermesOut += b; });
    hermes.stderr.on("data", (b) => { hermesOut += b; });

    const up = await waitHealth(apiPort, hermes, 90);
    check("Hermes real sobe como instância temporária", up.ok, up.ok ? `versão ${up.health.version}, 127.0.0.1:${apiPort}` : up.reason);
    if (!up.ok) { writeFileSync(hermesLog, hermesOut); result.bloqueio = up.reason; return result; }

    const auth = { Authorization: `Bearer ${secrets["chave da API do Hermes"]}` };
    const noKey = await fetch(`http://127.0.0.1:${apiPort}/v1/models`);
    check("API recusa sem a chave", noKey.status === 401, `HTTP ${noKey.status}`);
    const toolsets = await (await fetch(`http://127.0.0.1:${apiPort}/v1/toolsets`, { headers: auth })).json();
    const native = (toolsets.data ?? []).filter((t) => t.enabled);
    check("nenhum toolset nativo habilitado", native.length === 0, `${native.length} de ${(toolsets.data ?? []).length}`);

    // A chamada única, com o executor de verdade.
    const exec = await new Promise((res) => {
      const child = spawn(process.execPath, [join(here, "..", "executar-teste-inferencia.mjs"), "--executar"], {
        env: {
          PATH: process.env.PATH, HOME: home, OUT_DIR: join(dir, "registro"),
          HERMES_API_URL: `http://127.0.0.1:${apiPort}`, HERMES_API_KEY: secrets["chave da API do Hermes"],
          // Trava do executor. Aqui o "provedor" é o simulador em loopback: não há chamada paga.
          HERMES_INFERENCIA_APROVADA: "sim",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      child.stdout.on("data", (b) => { out += b; });
      child.stderr.on("data", (b) => { out += b; });
      child.on("close", (code) => res({ code, out }));
    });
    writeFileSync(join(dir, "executor-saida.txt"), exec.out);
    await sleep(1500);
    await stop(hermes);
    writeFileSync(hermesLog, hermesOut);
    await stop(limiter.child);
    await stop(provider.child);

    const registroDir = join(dir, "registro");
    const saved = existsSync(registroDir) && readdirSync(registroDir).length
      ? JSON.parse(readFileSync(join(registroDir, readdirSync(registroDir)[0]), "utf8")) : null;
    const prov = lines(logs.provider).filter((l) => l.chamada);
    const lim = lines(logs.limiter);
    const fn = lines(logs.fn);
    const offered = [...new Set(prov.flatMap((p) => p.ferramentasOferecidas ?? []))];
    const record = saved?.registro;
    const calls = (record?.output ?? []).filter((i) => i.type === "function_call");
    Object.assign(result, {
      executor: { codigo: exec.code, http: saved?.httpStatus, resultado: saved?.resultado, requestId: saved?.requestId },
      provedor: { chamadasRecebidas: prov.length, acoes: prov.map((p) => p.acao), fluxo: prov.map((p) => p.fluxo), ferramentasOferecidas: offered },
      limitador: { tentativas: lim.length, encaminhadas: lim.filter((l) => l.acao === "encaminhada").length, bloqueadas: lim.filter((l) => l.acao === "bloqueada").length, status: lim.map((l) => l.status) },
      funcao: { chamadas: fn.length, identificadores: [...new Set(fn.map((f) => f.requestId))] },
      registro: { itens: (record?.output ?? []).map((i) => i.type), ferramentasChamadas: calls.map((c) => c.name), status: record?.status },
    });

    // Vale para todo cenário.
    check("o provedor nunca recebe mais que o máximo", prov.length <= MAX_CALLS, `${prov.length} de ${MAX_CALLS}`);
    check("o provedor só recebe a chave que o limitador põe", prov.every((p) => p.chaveConfere === true));
    check("o Hermes oferece ao modelo só a ferramenta sintética", offered.length === 1 && offered[0] === WIRE_TOOL_NAME, JSON.stringify(offered));
    check("toda ferramenta executada é a sintética", calls.every((c) => c.name === WIRE_TOOL_NAME), JSON.stringify(calls.map((c) => c.name)));
    check("a função simulada só recebe o identificador deste teste",
      fn.every((f) => f.requestId === saved?.requestId), JSON.stringify(result.funcao.identificadores));

    if (mode === "normal") {
      const verdict = record ? verifyRecord(record, { requestId: saved.requestId }) : { ok: false, checks: [] };
      check("executor termina em 'passou'", exec.code === 0 && saved?.resultado === "passou", `código ${exec.code}`);
      check("verificador reconhece a resposta pelo mesmo identificador", verdict.ok,
        verdict.checks.filter((c) => !c.passed).map((c) => c.name).join("; "));
      check("duas chamadas ao modelo: pede a ferramenta, depois responde",
        JSON.stringify(result.provedor.acoes) === JSON.stringify(["pediu a ferramenta", "resposta final"]), JSON.stringify(result.provedor.acoes));
      check("a segunda chamada ao modelo já leva o resultado synthetic-staging", prov[1]?.resultadoTemSyntheticStaging === true);
      check("a ferramenta foi executada exatamente uma vez", fn.length === 1 && calls.length === 1, `função ${fn.length}, registro ${calls.length}`);
      check("nenhuma tentativa além das duas", lim.length === 2 && result.limitador.bloqueadas === 0, `tentativas ${lim.length}`);
    }
    if (mode === "repete") {
      check("a terceira chamada é barrada no limitador, antes do provedor",
        result.limitador.bloqueadas >= 1 && prov.length === MAX_CALLS, `tentativas ${lim.length}, bloqueadas ${result.limitador.bloqueadas}`);
      check("o executor termina em falha (não é um registro válido)", exec.code !== 0 && saved?.resultado !== "passou", `código ${exec.code}, HTTP ${saved?.httpStatus}`);
    }
    if (mode === "erro") {
      check("o erro do provedor não gera chamada além do máximo", prov.length <= MAX_CALLS && result.limitador.encaminhadas <= MAX_CALLS,
        `provedor ${prov.length}, encaminhadas ${result.limitador.encaminhadas}, bloqueadas ${result.limitador.bloqueadas}`);
      check("o executor termina em falha", exec.code !== 0 && saved?.resultado !== "passou", `código ${exec.code}, HTTP ${saved?.httpStatus}`);
    }

    // Controle positivo: um segredo plantado de propósito tem de ser encontrado pela mesma busca.
    const canary = `ensaio-canario-${randomBytes(16).toString("hex")}`;
    writeFileSync(join(tempHome, "canario.txt"), `linha qualquer ${canary} fim`);
    const roots = [tempHome, ownerHome, join(home, ".local", "state", "hermes"), ...controlDirs().filter((d) => !controlBefore.has(d))];
    const found = findSecrets(roots, { ...secrets, "canário (plantado)": canary }, { skip: [outRoot] });
    rmSync(join(tempHome, "canario.txt"), { force: true });
    check("a busca por segredos funciona (acha o canário plantado)", found.filter((h) => h.segredo.startsWith("canário")).length === 1);
    const hits = found.filter((h) => !h.segredo.startsWith("canário"));
    result.segredosEmDisco = hits;
    check("nenhum segredo do ensaio ficou em disco", hits.length === 0, hits.map((h) => `${h.segredo} em ${h.arquivo}`).join("; "));
    const newControl = controlDirs().filter((d) => !controlBefore.has(d));
    result.foraDaPastaTemporaria = {
      soquetesEmTmp: newControl.length,
      travaDoHost: existsSync(join(home, ".local", "state", "hermes", "gateway-locks", "host-gateway.json")),
      envCriado: existsSync(join(tempHome, ".env")), authJsonCriado: existsSync(join(tempHome, "auth.json")),
    };
    console.log(`observado [${mode}] fora da pasta temporária: ${newControl.length} pasta(s) hermes-gw-* em /tmp; trava do host em ~/.local/state/hermes: ${result.foraDaPastaTemporaria.travaDoHost}; .env criado: ${result.foraDaPastaTemporaria.envCriado}; auth.json criado: ${result.foraDaPastaTemporaria.authJsonCriado}`);
    const outputs = findSecrets([dir], secrets).filter((h) => !h.arquivo.includes("hermes-home-"));
    check("nenhum segredo nos registros e saídas do ensaio", outputs.length === 0, outputs.map((h) => `${h.segredo} em ${h.arquivo}`).join("; "));
    result.pastaTemporaria = { arquivos: 0, bytes: 0 };
    walk(tempHome, (f) => { result.pastaTemporaria.arquivos += 1; try { result.pastaTemporaria.bytes += statSync(f).size; } catch { /* sumiu */ } });
    return result;
  } finally {
    await stop(hermes, "SIGKILL");
    await stop(limiter?.child);
    await stop(provider?.child);
    // O gateway deixa a pasta do soquete de controle em /tmp; as criadas por este cenário saem aqui.
    for (const d of controlDirs()) if (!controlBefore.has(d)) rmSync(d, { recursive: true, force: true });
    if (!process.env.ENSAIO_MANTER) rmSync(tempHome, { recursive: true, force: true });
  }
}

/** Sobe um gateway só com a API, sem modelo nem ferramenta. */
function startBareGateway({ hermesHome, port, key, extraEnv = {}, args = [] }) {
  const child = spawn(hermesBin, ["gateway", "run", ...args], {
    cwd: hermesHome,
    env: {
      HOME: home, PATH: process.env.PATH, LANG: "en_US.UTF-8", NO_COLOR: "1",
      HERMES_HOME: hermesHome, HERMES_DISABLE_LAZY_INSTALLS: "1",
      API_SERVER_ENABLED: "true", API_SERVER_HOST: "127.0.0.1", API_SERVER_PORT: String(port), API_SERVER_KEY: key,
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = { text: "" };
  child.stdout.on("data", (b) => { out.text += b; });
  child.stderr.on("data", (b) => { out.text += b; });
  return { child, out };
}

async function detailedPid(port, key) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health/detailed`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3000) });
    return r.status === 200 ? (await r.json()).pid : null;
  } catch { return null; }
}

/**
 * O "serviço existente" (A) e a instância temporária (B) sob o mesmo usuário e o mesmo HOME.
 * O Hermes v0.23.1 só admite um `gateway run` por usuário: a trava fica em
 * $XDG_STATE_HOME/hermes/gateway-locks (padrão ~/.local/state). Aqui se observa o que
 * acontece sem isolar esse estado e com ele isolado numa pasta temporária.
 */
async function runCoexistence() {
  const mode = "coexistencia";
  const dir = join(outRoot, mode);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const homeA = mkdtempSync(join(dir, "servico-existente-"));
  const homeB = mkdtempSync(join(dir, "temporaria-"));
  const keyA = `ensaio-api-a-${randomBytes(16).toString("hex")}`;
  const keyB = `ensaio-api-b-${randomBytes(16).toString("hex")}`;
  const result = { cenario: mode, checks: [] };
  const check = (name, ok, detail = "") => {
    result.checks.push({ name, passed: Boolean(ok), detail: String(detail) });
    console.log(`${ok ? "passou  " : "FALHOU  "} [${mode}] ${name}${detail !== "" ? "  " + detail : ""}`);
  };
  const controlBefore = new Set(controlDirs());
  const lockFile = join(home, ".local", "state", "hermes", "gateway-locks", "host-gateway.json");
  const lockOwner = () => { try { return JSON.parse(readFileSync(lockFile, "utf8")).home; } catch { return null; } };
  let a; let b1; let b2;
  try {
    const portA = await freePort();
    a = startBareGateway({ hermesHome: homeA, port: portA, key: keyA });
    const upA = await waitHealth(portA, a.child, 90);
    check("o gateway A (papel de serviço existente) sobe", upA.ok, upA.ok ? `127.0.0.1:${portA}` : upA.reason);
    if (!upA.ok) { result.bloqueio = upA.reason; return result; }
    const pidA = await detailedPid(portA, keyA);
    check("a trava do host aponta para A", lockOwner() === homeA);

    // B1: mesma conta, mesmo HOME, sem isolar o estado.
    const portB1 = await freePort();
    b1 = startBareGateway({ hermesHome: homeB, port: portB1, key: keyB });
    const upB1 = await waitHealth(portB1, b1.child, 40);
    const refusal = b1.out.text.replace(/\s+/g, " ").replace(new RegExp(outRoot, "g"), "<saída>").trim().slice(-400);
    result.semIsolar = { subiu: upB1.ok, codigoDeSaida: b1.child.exitCode, mensagem: refusal };
    console.log(`observado [${mode}] segunda instância SEM isolar o estado: ${upB1.ok ? "subiu" : `não subiu (código ${b1.child.exitCode})`}`);
    if (!upB1.ok) console.log(`           mensagem do Hermes: ${refusal.slice(-260)}`);
    await stop(b1.child);
    check("A continua de pé, com o mesmo processo, depois da tentativa sem isolar",
      (await detailedPid(portA, keyA)) === pidA && pidA !== null, `pid ${pidA}`);
    check("a trava do host continua apontando para A", lockOwner() === homeA);

    // B2: estado isolado na própria pasta temporária.
    const portB2 = await freePort();
    b2 = startBareGateway({ hermesHome: homeB, port: portB2, key: keyB, extraEnv: { XDG_STATE_HOME: join(homeB, "xdg-state") } });
    const upB2 = await waitHealth(portB2, b2.child, 90);
    check("com XDG_STATE_HOME na pasta temporária, a segunda instância sobe ao lado de A", upB2.ok, upB2.ok ? `127.0.0.1:${portB2}` : upB2.reason);
    const pidB = upB2.ok ? await detailedPid(portB2, keyB) : null;
    check("são dois processos diferentes, cada um com a sua chave", pidB !== null && pidB !== pidA &&
      (await detailedPid(portB2, keyA)) === null && (await detailedPid(portA, keyB)) === null, `A ${pidA}, B ${pidB}`);
    check("A continua de pé, com o mesmo processo, enquanto B roda", (await detailedPid(portA, keyA)) === pidA);
    check("a trava do host em ~/.local/state não foi tocada por B", lockOwner() === homeA);
    check("B gravou a própria trava dentro da pasta temporária",
      existsSync(join(homeB, "xdg-state", "hermes", "gateway-locks", "host-gateway.json")));
    await stop(b2.child);
    await sleep(1000);
    check("depois de encerrar B, A segue de pé com o mesmo processo", (await detailedPid(portA, keyA)) === pidA);
    result.avisosDeA = (a.out.text.match(/WARNING[^\n]*/g) ?? []).filter((l) => /second|another|takeover|replace/i.test(l)).length;
    check("A não registrou aviso de segunda instância ou substituição", result.avisosDeA === 0, `${result.avisosDeA} aviso(s)`);
    return result;
  } finally {
    await stop(b1?.child, "SIGKILL");
    await stop(b2?.child, "SIGKILL");
    await stop(a?.child);
    for (const d of controlDirs()) if (!controlBefore.has(d)) rmSync(d, { recursive: true, force: true });
    if (!process.env.ENSAIO_MANTER) { rmSync(homeA, { recursive: true, force: true }); rmSync(homeB, { recursive: true, force: true }); }
  }
}

// ---------------------------------------------------------------------------

const startedAt = Date.now();
const tracked = ["config.yaml", ".env", "pyproject.toml", "uv.lock"].filter((f) => existsSync(join(ownerHome, f)));
const snapshot = () => Object.fromEntries(tracked.map((f) => [f, sha(join(ownerHome, f))]));
const ownerBefore = snapshot();
const report = { inicio: new Date(startedAt).toISOString(), hermes: hermesBin.replace(home, "<HOME>"), cenarios: [] };
for (const mode of scenarios) {
  console.log(`\n===== cenário: ${mode} =====`);
  report.cenarios.push(mode === "coexistencia" ? await runCoexistence() : await runScenario(mode));
}

console.log("\n===== instalação (pasta dona), antes e depois =====");
const ownerAfter = snapshot();
const ownerSame = JSON.stringify(ownerBefore) === JSON.stringify(ownerAfter);
console.log(`${ownerSame ? "passou  " : "FALHOU  "} arquivos de configuração da instalação inalterados (${tracked.join(", ")})`);
const changed = changedSince(ownerHome, startedAt, [outRoot]).filter((f) => !f.includes("__pycache__"));
const bytecode = changedSince(ownerHome, startedAt, [outRoot]).length - changed.length;
console.log(`cache de bytecode do Python gravado na instalação: ${bytecode} arquivo(s) em __pycache__`);
const grouped = {};
for (const f of changed) { const top = f.split("/").slice(0, 3).join("/"); grouped[top] = (grouped[top] ?? 0) + 1; }
console.log(`arquivos da instalação modificados durante o ensaio: ${changed.length}`);
for (const [k, n] of Object.entries(grouped).slice(0, 20)) console.log(`   ${k}  (${n})`);
report.instalacao = { configuracaoInalterada: ownerSame, arquivosModificados: changed.length, bytecode, porPasta: grouped };
report.fim = new Date().toISOString();
writeFileSync(join(outRoot, "relatorio.json"), JSON.stringify(report, null, 2));

const failed = report.cenarios.flatMap((c) => c.checks.filter((k) => !k.passed).map((k) => `[${c.cenario}] ${k.name}`));
console.log(`\nrelatório em ${join(outRoot, "relatorio.json")}`);
console.log(failed.length === 0 && ownerSame ? "RESULTADO: passou" : `RESULTADO: ${failed.length} verificação(ões) falharam`);
process.exit(failed.length === 0 && ownerSame ? 0 : 1);
