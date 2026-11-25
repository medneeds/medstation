-- Banco local descartável para testar os planos de GRANT sem tocar em servidor
-- nenhum. Escrito pelo Claude em 24/11/2026.
--
-- Reproduz, a partir do catálogo da HOMOLOGAÇÃO lido em 24/11/2026:
--   * os papéis anon, authenticated e service_role;
--   * o privilégio padrão do projeto novo (só Dxtm para os três papéis);
--   * a tabela public.profiles com as mesmas colunas, constraints e as quatro
--     políticas;
--   * as outras 17 tabelas antigas em forma mínima (só para conferir ACL).
--
-- Não reproduz: triggers de profiles, demais esquemas do Supabase, dados reais.
-- Os dois usuários são fictícios.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text unique);

-- Mesmo contrato do auth.uid() do Supabase: lê o `sub` do JWT da requisição.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Padrão medido na homologação para tabelas criadas pelo papel postgres:
--   anon=Dxtm, authenticated=Dxtm, service_role=Dxtm
alter default privileges in schema public
  grant truncate, references, trigger, maintain on tables
  to anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  crm text,
  specialty text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  date_of_birth date,
  crm_state text,
  graduation_year integer,
  phone text,
  cpf text,
  rqe text,
  bio text,
  address text,
  city text,
  state text,
  postal_code text,
  gender text check (gender = any (array['M', 'F', 'Outro'])),
  avatar_url text,
  professional_status text not null default 'medico',
  medical_school text,
  current_period text,
  clinic_name text,
  clinic_phone text,
  letterhead_logo_url text
);
alter table public.profiles enable row level security;

create policy "Users can create own profile" on public.profiles
  for insert to public with check (auth.uid() = id);
create policy "Users can delete own profile" on public.profiles
  for delete to authenticated using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- As outras 17 tabelas antigas, em forma mínima.
do $$
declare t text;
begin
  foreach t in array array[
    'cases', 'conversations', 'courtesy_access', 'evidences', 'exam_requests',
    'medical_documents', 'messages', 'note_versions', 'notes', 'notifications',
    'patients', 'prescription_library', 'prescriptions', 'rate_limits',
    'referral_codes', 'referrals', 'security_events'
  ] loop
    execute format('create table public.%I (id uuid primary key, user_id uuid)', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Dois usuários fictícios, cada um com o próprio perfil.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'homolog-medico@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'homolog-admin@example.com');
insert into public.profiles (id, full_name) values
  ('11111111-1111-4111-8111-111111111111', 'Dra. Fictícia Teste (fictício)'),
  ('22222222-2222-4222-8222-222222222222', 'Admin Homologação (fictício)');
