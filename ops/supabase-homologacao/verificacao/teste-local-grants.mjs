/**
 * Testa os planos de GRANT (001 e 002) e as reversões num Postgres local
 * descartável, em memória (PGlite). Não se conecta a servidor nenhum.
 * Escrito pelo Claude em 24/11/2026.
 *
 * Uso: ops/supabase-homologacao/verificacao/rodar-teste-local.sh
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const plano = join(here, "..", "plano");
const pgliteEntry = process.env.PGLITE_ENTRY;
if (!pgliteEntry) {
  console.error("defina PGLITE_ENTRY (use rodar-teste-local.sh)");
  process.exit(2);
}
const { PGlite } = await import(pathToFileURL(pgliteEntry).href);

const sql = (name) => readFileSync(join(plano, name), "utf8");
const MEDICO = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const ANTIGAS = [
  "cases", "conversations", "courtesy_access", "evidences", "exam_requests",
  "medical_documents", "messages", "note_versions", "notes", "notifications",
  "patients", "prescription_library", "prescriptions", "profiles", "rate_limits",
  "referral_codes", "referrals", "security_events",
];
const PROFILE_COLS =
  "full_name, gender, avatar_url, crm, crm_state, specialty, address, city, state";

const db = new PGlite();
await db.exec(readFileSync(join(here, "fixture-local.sql"), "utf8"));

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "passou  " : "FALHOU  "} ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failures += 1;
}

/** Roda uma consulta como um papel do Supabase, com o `sub` do JWT, e volta ao superusuário. */
async function as(role, sub, query) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    sub ? JSON.stringify({ sub, role }) : "",
  ]);
  await db.exec(`set role ${role}`);
  try {
    return { rows: (await db.query(query)).rows };
  } catch (e) {
    return { error: e.code };
  } finally {
    await db.exec("reset role");
  }
}

async function acl() {
  const { rows } = await db.query(
    `select c.relname, coalesce(c.relacl::text, '') as acl
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any($1) order by 1`,
    [ANTIGAS],
  );
  return Object.fromEntries(rows.map((r) => [r.relname, r.acl]));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const priv = async (role, table, p) =>
  (await db.query("select has_table_privilege($1, $2, $3) as ok", [role, `public.${table}`, p]))
    .rows[0].ok;

const aclInicial = await acl();
check(
  "estado inicial igual ao medido na homologação (Dxtm para os três papéis)",
  Object.values(aclInicial).every(
    (a) => a === "{postgres=arwdDxtm/postgres,anon=Dxtm/postgres,authenticated=Dxtm/postgres,service_role=Dxtm/postgres}",
  ),
);

console.log("\n-- antes do 001 (reproduz a falha de hoje) --");
let r = await as("authenticated", MEDICO, `select ${PROFILE_COLS} from public.profiles where id = '${MEDICO}'`);
check("usuário logado lendo o próprio perfil é negado (42501)", r.error === "42501", String(r.error));

console.log("\n-- depois do 001 --");
await db.exec(sql("001_grant_select_profiles.sql"));
r = await as("authenticated", MEDICO, `select id, ${PROFILE_COLS} from public.profiles where id = '${MEDICO}'`);
check("conta fictícia lê a própria linha", r.rows?.length === 1 && r.rows[0].id === MEDICO);
r = await as("authenticated", MEDICO, `select id from public.profiles where id = '${ADMIN}'`);
check("conta fictícia não lê a linha de outro usuário", r.rows?.length === 0);
r = await as("authenticated", MEDICO, "select id from public.profiles");
check("sem filtro, só a própria linha aparece", r.rows?.length === 1 && r.rows[0].id === MEDICO);
r = await as("authenticated", ADMIN, "select id from public.profiles");
check("a outra conta também só vê a própria", r.rows?.length === 1 && r.rows[0].id === ADMIN);
r = await as("anon", null, "select id from public.profiles");
check("anônimo não lê nenhuma linha (42501)", r.error === "42501", String(r.error ?? r.rows?.length));
r = await as("authenticated", null, "select id from public.profiles");
check("papel authenticated sem `sub` não vê linha nenhuma", r.rows?.length === 0);
r = await as("authenticated", MEDICO, `update public.profiles set full_name = 'x' where id = '${MEDICO}'`);
check("o 001 não libera alteração do perfil (42501)", r.error === "42501", String(r.error));
r = await as("authenticated", MEDICO, `delete from public.profiles where id = '${MEDICO}'`);
check("o 001 não libera exclusão do perfil (42501)", r.error === "42501", String(r.error));
r = await as("service_role", null, "select id from public.profiles");
check("o 001 não muda nada para service_role (42501)", r.error === "42501", String(r.error));
const aclApos001 = await acl();
check(
  "só a ACL de profiles mudou, e só para authenticated",
  aclApos001.profiles ===
    "{postgres=arwdDxtm/postgres,anon=Dxtm/postgres,authenticated=rDxtm/postgres,service_role=Dxtm/postgres}" &&
    ANTIGAS.filter((t) => t !== "profiles").every((t) => aclApos001[t] === aclInicial[t]),
  aclApos001.profiles,
);

console.log("\n-- reversão do 001 --");
await db.exec(sql("001_grant_select_profiles.rollback.sql"));
check("ACL volta exatamente ao estado inicial", same(await acl(), aclInicial));
r = await as("authenticated", MEDICO, `select id from public.profiles where id = '${MEDICO}'`);
check("leitura do próprio perfil volta a ser negada (42501)", r.error === "42501", String(r.error));

console.log("\n-- 001 + 002 (segunda fase, fora desta rodada) --");
await db.exec(sql("001_grant_select_profiles.sql"));
await db.exec(sql("002_grants_demais_tabelas_legadas.sql"));
check("002 não dá privilégio de dados a anon em nenhuma das 18 tabelas", (
  await Promise.all(ANTIGAS.flatMap((t) => ["select", "insert", "update", "delete"].map((p) => priv("anon", t, p))))
).every((ok) => ok === false));
check("002 dá a service_role leitura e escrita nas 18 tabelas", (
  await Promise.all(ANTIGAS.flatMap((t) => ["select", "insert", "update", "delete"].map((p) => priv("service_role", t, p))))
).every((ok) => ok === true));
check("002 respeita os conjuntos menores (ex.: rate_limits só leitura)",
  (await priv("authenticated", "rate_limits", "select")) === true &&
  (await priv("authenticated", "rate_limits", "insert")) === false &&
  (await priv("authenticated", "messages", "update")) === false &&
  (await priv("authenticated", "referrals", "delete")) === false);
r = await as("authenticated", MEDICO, `update public.profiles set full_name = 'Dra. Fictícia Teste (fictício)' where id = '${ADMIN}'`);
check("com o 002, alterar o perfil de outro usuário não afeta linha nenhuma", !r.error);
r = await as("authenticated", ADMIN, `select full_name from public.profiles where id = '${ADMIN}'`);
check("perfil do outro usuário continua intacto", r.rows?.[0]?.full_name === "Admin Homologação (fictício)");

console.log("\n-- reversão do 002, depois do 001 --");
await db.exec(sql("002_grants_demais_tabelas_legadas.rollback.sql"));
check("reverter o 002 devolve o estado de 'só 001' (o SELECT do 001 fica)", same(await acl(), aclApos001));
await db.exec(sql("001_grant_select_profiles.rollback.sql"));
check("reverter o 001 em seguida devolve o estado inicial", same(await acl(), aclInicial));

await db.close();
console.log(failures === 0 ? "\nRESULTADO: passou" : `\nRESULTADO: falhou (${failures})`);
process.exit(failures === 0 ? 0 : 1);
