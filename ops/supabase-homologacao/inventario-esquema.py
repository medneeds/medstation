#!/usr/bin/env python3
"""Inventário estático do esquema esperado a partir das migrações do repositório.

Escrito pelo Claude em 24/11/2026 para a homologação fora da Lovable.

Lê supabase/migrations/*.sql e drizzle/migrations/*.sql em ordem, SEM executar
nada e sem se conectar a banco nenhum, e monta o estado final esperado por
nome: tabelas, colunas, funções, políticas, triggers, índices, enums, views,
buckets, extensões, cron jobs e tabelas em realtime.

Uso:
  python3 ops/supabase-homologacao/inventario-esquema.py . --json
      resumo e listas pequenas em JSON
  python3 ops/supabase-homologacao/inventario-esquema.py . --sql
      consulta SOMENTE LEITURA que compara esse inventário com o catálogo do
      Postgres; cole no SQL Editor do projeto de HOMOLOGAÇÃO.

Limite: compara nomes. Não compara tipos, defaults, constraints, expressões de
política nem privilégios (GRANT).
"""
import json
import re
import sys
from pathlib import Path

repo = Path(sys.argv[1])
mode = sys.argv[2] if len(sys.argv) > 2 else "--json"


def split_statements(sql: str):
    out, buf, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith("--", i):
            j = sql.find("\n", i)
            i = n if j < 0 else j
            continue
        if sql.startswith("/*", i):
            j = sql.find("*/", i)
            i = n if j < 0 else j + 2
            continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(sql[i:j + 1]); i = j + 1
            continue
        if c == '"':
            j = sql.find('"', i + 1)
            j = n - 1 if j < 0 else j
            buf.append(sql[i:j + 1]); i = j + 1
            continue
        if c == "$":
            m = re.match(r"\$[A-Za-z_]*\$", sql[i:])
            if m:
                tag = m.group(0)
                j = sql.find(tag, i + len(tag))
                j = n - len(tag) if j < 0 else j
                buf.append(sql[i:j + len(tag)]); i = j + len(tag)
                continue
        if c == ";":
            s = "".join(buf).strip()
            if s:
                out.append(s)
            buf = []; i += 1
            continue
        buf.append(c); i += 1
    s = "".join(buf).strip()
    if s:
        out.append(s)
    return out


IDENT = r'(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)'
QN = rf'(?:{IDENT}\.)?{IDENT}'


def norm(name: str, default_schema="public"):
    parts = re.findall(r'"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*', name)
    parts = [p[1:-1] if p.startswith('"') else p.lower() for p in parts]
    if len(parts) == 1:
        return default_schema, parts[0]
    return parts[-2], parts[-1]


def split_top(body: str):
    items, depth, buf, i = [], 0, [], 0
    while i < len(body):
        c = body[i]
        if c == "'":
            j = i + 1
            while j < len(body):
                if body[j] == "'":
                    if j + 1 < len(body) and body[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(body[i:j + 1]); i = j + 1
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        if c == "," and depth == 0:
            items.append("".join(buf).strip()); buf = []
        else:
            buf.append(c)
        i += 1
    if "".join(buf).strip():
        items.append("".join(buf).strip())
    return items


tables, columns = {}, {}
functions, policies, triggers = set(), set(), set()
indexes, enums, views, buckets, extensions, cron, realtime = set(), {}, set(), set(), set(), set(), set()
unparsed = []
CONSTRAINT_KW = ("constraint", "primary", "unique", "check", "foreign", "exclude", "like")


def drop_table(key):
    tables.pop(key, None)
    columns.pop(key, None)
    for s in (policies, triggers):
        for item in [x for x in s if (x[0], x[1]) == key]:
            s.discard(item)
    for item in [x for x in indexes if x[1] == key]:
        indexes.discard(item)


def handle(stmt: str, src: str):
    s = stmt.strip()
    low = re.sub(r"\s+", " ", s.lower())

    m = re.match(rf"create (?:unlogged )?table (?:if not exists )?({QN})\s*\((.*)\)[^)]*$", s, re.I | re.S)
    if m:
        key = norm(m.group(1))
        if key not in tables:
            tables[key] = src
            cols = columns.setdefault(key, set())
            for item in split_top(m.group(2)):
                first = re.match(rf"\s*({IDENT})", item)
                if not first:
                    continue
                tok = first.group(1)
                if tok.lower() in CONSTRAINT_KW:
                    continue
                cols.add(tok[1:-1] if tok.startswith('"') else tok.lower())
        return
    m = re.match(rf"drop table (?:if exists )?(.+?)(?: cascade| restrict)?$", s, re.I | re.S)
    if m:
        for name in m.group(1).split(","):
            drop_table(norm(name.strip()))
        return
    m = re.match(rf"alter table (?:if exists )?(?:only )?({QN})\s+(.*)$", s, re.I | re.S)
    if m:
        key = norm(m.group(1))
        for action in split_top(m.group(2)):
            a = action.strip()
            mm = re.match(rf"add (?:column )?(?:if not exists )?({IDENT})\s+(?!key|\()", a, re.I)
            if mm and mm.group(1).lower() not in CONSTRAINT_KW:
                tok = mm.group(1)
                columns.setdefault(key, set()).add(tok[1:-1] if tok.startswith('"') else tok.lower())
                continue
            mm = re.match(rf"drop column (?:if exists )?({IDENT})", a, re.I)
            if mm:
                columns.setdefault(key, set()).discard(mm.group(1).strip('"').lower())
                continue
            mm = re.match(rf"rename column ({IDENT}) to ({IDENT})", a, re.I)
            if mm:
                columns.setdefault(key, set()).discard(mm.group(1).strip('"').lower())
                columns[key].add(mm.group(2).strip('"').lower())
                continue
            mm = re.match(rf"rename to ({IDENT})", a, re.I)
            if mm:
                new = (key[0], mm.group(1).strip('"').lower())
                tables[new] = tables.pop(key, src)
                columns[new] = columns.pop(key, set())
                continue
        return
    m = re.match(rf"create (?:or replace )?function ({QN})\s*\(", s, re.I)
    if m:
        functions.add(norm(m.group(1)))
        return
    m = re.match(rf"drop function (?:if exists )?({QN})", s, re.I)
    if m:
        functions.discard(norm(m.group(1)))
        return
    m = re.match(rf'create policy ("[^"]+"|{IDENT})\s+on ({QN})', s, re.I | re.S)
    if m:
        sch, tb = norm(m.group(2))
        policies.add((sch, tb, m.group(1).strip('"')))
        return
    m = re.match(rf'drop policy (?:if exists )?("[^"]+"|{IDENT})\s+on ({QN})', s, re.I | re.S)
    if m:
        sch, tb = norm(m.group(2))
        policies.discard((sch, tb, m.group(1).strip('"')))
        return
    m = re.match(rf"create (?:or replace )?(?:constraint )?trigger ({IDENT})\s.*?\son ({QN})", s, re.I | re.S)
    if m:
        sch, tb = norm(m.group(2))
        triggers.add((sch, tb, m.group(1).strip('"').lower()))
        return
    m = re.match(rf"drop trigger (?:if exists )?({IDENT})\s+on ({QN})", s, re.I | re.S)
    if m:
        sch, tb = norm(m.group(2))
        triggers.discard((sch, tb, m.group(1).strip('"').lower()))
        return
    m = re.match(rf"create (?:unique )?index (?:concurrently )?(?:if not exists )?({IDENT})\s+on (?:only )?({QN})", s, re.I | re.S)
    if m:
        indexes.add((m.group(1).strip('"').lower(), norm(m.group(2))))
        return
    m = re.match(rf"drop index (?:concurrently )?(?:if exists )?({QN})", s, re.I)
    if m:
        nm = norm(m.group(1))[1]
        for item in [x for x in indexes if x[0] == nm]:
            indexes.discard(item)
        return
    m = re.match(rf"create type ({QN}) as enum\s*\((.*)\)$", s, re.I | re.S)
    if m:
        enums[norm(m.group(1))] = re.findall(r"'([^']*)'", m.group(2))
        return
    m = re.match(rf"alter type ({QN}) add value (?:if not exists )?'([^']*)'", s, re.I)
    if m:
        enums.setdefault(norm(m.group(1)), []).append(m.group(2))
        return
    m = re.match(rf"create (?:or replace )?view ({QN})", s, re.I)
    if m:
        views.add(norm(m.group(1)))
        return
    m = re.match(rf"drop view (?:if exists )?({QN})", s, re.I)
    if m:
        views.discard(norm(m.group(1)))
        return
    if low.startswith("insert into storage.buckets"):
        vals = re.search(r"values\s*(.*)$", s, re.I | re.S)
        if vals:
            for tup in re.findall(r"\(\s*'([^']+)'", vals.group(1)):
                buckets.add(tup)
        return
    m = re.match(rf"alter publication supabase_realtime add table ({QN})", s, re.I)
    if m:
        realtime.add(norm(m.group(1)))
        return
    for ext in re.findall(r"create extension (?:if not exists )?\"?([a-z_0-9-]+)\"?", low):
        extensions.add(ext)
    for job in re.findall(r"cron\.schedule\(\s*'([^']+)'", s, re.I):
        cron.add(job)
    if low.startswith("do "):
        return
    head = " ".join(low.split(" ")[:3])
    if not re.match(r"(grant|revoke|update|insert|delete|comment|alter function|alter publication|alter default|select|create extension|set |notify|begin|commit|alter type|alter view|create schema)", low):
        unparsed.append((src, head))


files = sorted((repo / "supabase/migrations").glob("*.sql")) + sorted((repo / "drizzle/migrations").glob("*.sql"))
for f in files:
    text = f.read_text(errors="replace").replace("--> statement-breakpoint", "")
    for st in split_statements(text):
        handle(st, f.name)

exp = {
    "files": len(files),
    "tables": sorted(t for (s, t) in tables if s == "public"),
    "columns": sorted((t, c) for (s, t), cs in columns.items() if s == "public" and (s, t) in tables for c in cs),
    "functions": sorted({f for (s, f) in functions if s == "public"}),
    "policies": sorted((s, t, p) for (s, t, p) in policies),
    "triggers": sorted((s, t, g) for (s, t, g) in triggers),
    "indexes": sorted(i for (i, key) in indexes if key[0] == "public"),
    "enums": {f"{s}.{t}": v for (s, t), v in enums.items()},
    "views": sorted(v for (s, v) in views if s == "public"),
    "buckets": sorted(buckets),
    "extensions": sorted(extensions),
    "cron": sorted(cron),
    "realtime": sorted(t for (s, t) in realtime),
    "non_public_tables": sorted(f"{s}.{t}" for (s, t) in tables if s != "public"),
    "unparsed": unparsed,
}

if mode == "--json":
    summary = {k: (len(v) if isinstance(v, (list, dict)) else v) for k, v in exp.items()}
    print(json.dumps(summary, ensure_ascii=False))
    print(json.dumps({k: exp[k] for k in ("enums", "views", "buckets", "extensions", "cron", "realtime", "non_public_tables", "unparsed")}, ensure_ascii=False, indent=1))
    sys.exit(0)


def q(v):
    return "'" + v.replace("'", "''") + "'"


def values(rows):
    return ",".join("(" + ",".join(q(x) for x in r) + ")" for r in rows) or "(null)"


sql = f"""
with exp_tables(t) as (values {values([(t,) for t in exp['tables']])}),
exp_cols(t,c) as (values {values(exp['columns'])}),
exp_funcs(f) as (values {values([(f,) for f in exp['functions']])}),
exp_pol(s,t,p) as (values {values(exp['policies'])}),
exp_trg(s,t,g) as (values {values(exp['triggers'])}),
exp_idx(i) as (values {values([(i,) for i in exp['indexes']])}),
act_tables as (select tablename t from pg_tables where schemaname='public'),
act_cols as (select table_name t, column_name c from information_schema.columns where table_schema='public' and table_name in (select t from act_tables)),
act_funcs as (select distinct p.proname f from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
act_pol as (select schemaname s, tablename t, policyname p from pg_policies where schemaname in ('public','storage')),
act_trg as (select n.nspname s, c.relname t, tg.tgname g from pg_trigger tg join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace where not tg.tgisinternal and n.nspname in ('public','auth','storage')),
act_idx as (select indexname i from pg_indexes where schemaname='public' and indexname not in (select conname from pg_constraint))
select json_build_object(
 'tabelas_faltando_no_staging', (select json_agg(t order by t) from exp_tables where t not in (select t from act_tables)),
 'tabelas_extras_no_staging', (select json_agg(t order by t) from act_tables where t not in (select t from exp_tables)),
 'colunas_faltando_no_staging', (select json_agg(t||'.'||c order by t,c) from exp_cols e where t in (select t from act_tables) and not exists (select 1 from act_cols a where a.t=e.t and a.c=e.c)),
 'colunas_extras_no_staging', (select json_agg(t||'.'||c order by t,c) from act_cols a where t in (select t from exp_tables) and not exists (select 1 from exp_cols e where a.t=e.t and a.c=e.c)),
 'funcoes_faltando_no_staging', (select json_agg(f order by f) from exp_funcs where f not in (select f from act_funcs)),
 'funcoes_extras_no_staging', (select json_agg(f order by f) from act_funcs where f not in (select f from exp_funcs)),
 'politicas_faltando_no_staging', (select json_agg(s||'.'||t||': '||p order by s,t,p) from exp_pol e where not exists (select 1 from act_pol a where a.s=e.s and a.t=e.t and a.p=e.p)),
 'politicas_extras_no_staging', (select json_agg(s||'.'||t||': '||p order by s,t,p) from act_pol a where not exists (select 1 from exp_pol e where a.s=e.s and a.t=e.t and a.p=e.p)),
 'triggers_faltando_no_staging', (select json_agg(s||'.'||t||': '||g order by s,t,g) from exp_trg e where not exists (select 1 from act_trg a where a.s=e.s and a.t=e.t and a.g=e.g)),
 'triggers_extras_no_staging', (select json_agg(s||'.'||t||': '||g order by s,t,g) from act_trg a where not exists (select 1 from exp_trg e where a.s=e.s and a.t=e.t and a.g=e.g)),
 'indices_faltando_no_staging', (select json_agg(i order by i) from exp_idx where i not in (select i from act_idx)),
 'indices_extras_no_staging', (select json_agg(i order by i) from act_idx where i not in (select i from exp_idx)),
 'contagens_esperadas', json_build_object('tabelas',(select count(*) from exp_tables),'colunas',(select count(*) from exp_cols),'funcoes',(select count(*) from exp_funcs),'politicas',(select count(*) from exp_pol),'triggers',(select count(*) from exp_trg),'indices',(select count(*) from exp_idx)),
 'contagens_staging', json_build_object('tabelas',(select count(*) from act_tables),'colunas',(select count(*) from act_cols),'funcoes',(select count(*) from act_funcs),'politicas',(select count(*) from act_pol),'triggers',(select count(*) from act_trg),'indices',(select count(*) from act_idx))
) as diff;
"""
print(sql)
