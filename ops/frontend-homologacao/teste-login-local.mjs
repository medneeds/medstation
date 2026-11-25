/**
 * Abre o app servido localmente num navegador sem interface, faz login com a
 * conta fictícia e registra para onde cada requisição foi.
 * Escrito pelo Claude em 24/11/2026.
 *
 * Trava de segurança: o navegador só pode falar com o servidor local e com o
 * Supabase de HOMOLOGAÇÃO. Qualquer outro destino (produção, Lovable, Meta,
 * PostHog, fontes) é abortado antes de sair e entra na lista "bloqueados".
 *
 * Uso: ops/frontend-homologacao/rodar-teste-login-local.sh
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const STAGING_REF = "qcvvwbbeuvawgccstyro";
const PRODUCTION_REF = "rwiovxyftfbkvzbepfqi";
const BASE = process.env.APP_URL ?? "http://127.0.0.1:4173";
const OUT = process.env.OUT_DIR ?? "./saida-teste-login";
const SECRETS = process.env.MEDSTATION_HOMOLOG_DIR ?? `${process.env.HOME}/.medstation-homolog`;
const EMAIL = "homolog-medico@example.com";
const password = readFileSync(join(SECRETS, "staging-user-password"), "utf8");
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_ENTRY).href);

mkdirSync(OUT, { recursive: true });
const appHost = new URL(BASE).host;
const stagingHost = `${STAGING_REF}.supabase.co`;
const allowed = new Set([appHost, stagingHost]);

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "pt-BR", viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const blocked = new Map(); // host -> { count, types }
const staging = []; // { method, path, status }
const consoleErrors = [];
let productionAttempts = 0;

await context.route("**/*", (route) => {
  const req = route.request();
  const url = new URL(req.url());
  if (url.protocol === "data:" || url.protocol === "blob:") return route.continue();
  if (url.host.includes(PRODUCTION_REF)) productionAttempts += 1;
  if (allowed.has(url.host)) return route.continue();
  const entry = blocked.get(url.host) ?? { count: 0, types: new Set() };
  entry.count += 1;
  entry.types.add(req.resourceType());
  blocked.set(url.host, entry);
  return route.abort();
});
page.on("websocket", (ws) => {
  const url = new URL(ws.url());
  if (url.host.includes(PRODUCTION_REF)) productionAttempts += 1;
  staging.push({ method: "WS", path: url.pathname, status: url.host === stagingHost ? "aberto" : `outro host: ${url.host}` });
});
page.on("response", (res) => {
  const url = new URL(res.url());
  if (url.host !== stagingHost) return;
  staging.push({ method: res.request().method(), path: url.pathname, status: res.status() });
});
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 240));
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 240)}`));

const steps = [];
const step = (name, ok, detail = "") => {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "passou  " : "FALHOU  "} ${name}${detail ? "  " + detail : ""}`);
};
const settle = (ms) => page.waitForTimeout(ms);

// 1) tela de login
await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
const emailField = page.locator("#signin-email");
const loginVisible = await emailField.waitFor({ state: "visible", timeout: 20000 }).then(() => true, () => false);
step("tela de login carrega", loginVisible);
await page.screenshot({ path: join(OUT, "1-login.png") });
const googleButton = await page.getByRole("button", { name: /google/i }).count();
step("botão 'Continuar com Google' presente (depende do broker da Lovable)", googleButton > 0, `botões: ${googleButton}`);

// 2) login com a conta fictícia
let afterLoginPath = "";
if (loginVisible) {
  await emailField.fill(EMAIL);
  await page.locator("#signin-password").fill(password);
  const tokenResponse = page.waitForResponse(
    (r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST",
    { timeout: 20000 },
  ).catch(() => null);
  await page.locator("#signin-password").press("Enter");
  const tok = await tokenResponse;
  step("POST /auth/v1/token vai para a homologação e responde 200",
    !!tok && new URL(tok.url()).host === stagingHost && tok.status() === 200,
    tok ? `${new URL(tok.url()).host} -> ${tok.status()}` : "sem resposta");
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 20000 }).catch(() => {});
  await settle(9000);
  afterLoginPath = new URL(page.url()).pathname;
  step("sai da tela de login depois de autenticar", !afterLoginPath.startsWith("/auth"), `rota: ${afterLoginPath}`);
  await page.screenshot({ path: join(OUT, "2-depois-do-login.png"), fullPage: false });
}

// 3) o que a tela mostra
const bodyText = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
const session = await page.evaluate((ref) => {
  const raw = localStorage.getItem(`sb-${ref}-auth-token`);
  if (!raw) return null;
  try { const s = JSON.parse(raw); return { email: s?.user?.email ?? null, hasToken: Boolean(s?.access_token) }; }
  catch { return null; }
}, STAGING_REF);
step("sessão guardada no navegador é da homologação", session?.email === EMAIL && session?.hasToken === true,
  session ? `chave sb-${STAGING_REF}-auth-token, e-mail ${session.email}` : "sem sessão");
step("nenhuma requisição tentou a produção", productionAttempts === 0, `tentativas: ${productionAttempts}`);

// 4) resumo das chamadas à homologação
const grouped = new Map();
for (const s of staging) {
  const key = `${s.method} ${s.path} -> ${s.status}`;
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}
const stagingSummary = [...grouped.entries()].map(([k, n]) => (n > 1 ? `${k}  (x${n})` : k)).sort();
const blockedSummary = [...blocked.entries()]
  .map(([host, e]) => `${host}  (${e.count}; ${[...e.types].join(", ")})`).sort();

const report = {
  app: BASE, stagingHost, steps, afterLoginPath,
  telaDepoisDoLogin: bodyText.slice(0, 600),
  chamadasHomologacao: stagingSummary,
  destinosBloqueados: blockedSummary,
  errosDeConsole: [...new Set(consoleErrors)].slice(0, 25),
  tentativasProducao: productionAttempts,
};
writeFileSync(join(OUT, "relatorio.json"), JSON.stringify(report, null, 2));
console.log("\n-- chamadas à homologação --\n" + stagingSummary.join("\n"));
console.log("\n-- destinos bloqueados pela trava (não saíram) --\n" + (blockedSummary.join("\n") || "(nenhum)"));
console.log("\n-- erros de console (únicos) --\n" + (report.errosDeConsole.join("\n") || "(nenhum)"));
console.log("\n-- texto visível depois do login (início) --\n" + report.telaDepoisDoLogin.slice(0, 400));

await browser.close();
const failed = steps.filter((s) => !s.ok).length;
console.log(failed === 0 ? "\nRESULTADO: passou" : `\nRESULTADO: ${failed} verificação(ões) falharam`);
process.exit(failed === 0 ? 0 : 1);
