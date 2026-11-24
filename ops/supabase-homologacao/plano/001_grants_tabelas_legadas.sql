-- PLANO — NÃO APLICADO. Escrito pelo Claude em 24/11/2026.
--
-- Alvo: SOMENTE o projeto de homologação qcvvwbbeuvawgccstyro.
-- Não colocar em supabase/migrations nem em drizzle/migrations: a produção não
-- precisa disto e este arquivo não deve entrar no fluxo da Lovable.
--
-- Problema: as 18 tabelas abaixo nasceram em migrações de 2025, sem GRANT
-- explícito, quando o Supabase dava os privilégios por padrão. No projeto de
-- homologação (criado em 24/11/2026) o padrão para objetos criados pelo papel
-- `postgres` é não dar leitura nem escrita. Resultado: RLS e políticas existem,
-- mas `authenticated` e `service_role` recebem "permission denied" (42501).
--
-- Regra usada: `authenticated` recebe só os comandos que as políticas da
-- tabela já preveem; `service_role` recebe tudo (as Edge Functions dependem
-- dele); `anon` não recebe nada. As políticas continuam decidindo as linhas.
--
-- Antes de aplicar: conferir com o catálogo da PRODUÇÃO (consulta somente
-- leitura no README desta pasta, a ser rodada pelo Artur) se a produção dá
-- mais ou menos do que isto.
--
-- Reversão: 001_grants_tabelas_legadas.rollback.sql

begin;

-- leitura, inclusão, alteração e exclusão (políticas "own ..." por usuário)
grant select, insert, update, delete on public.cases                to authenticated;
grant select, insert, update, delete on public.conversations        to authenticated;
grant select, insert, update, delete on public.courtesy_access      to authenticated;
grant select, insert, update, delete on public.evidences            to authenticated;
grant select, insert, update, delete on public.exam_requests        to authenticated;
grant select, insert, update, delete on public.medical_documents    to authenticated;
grant select, insert, update, delete on public.notes                to authenticated;
grant select, insert, update, delete on public.notifications        to authenticated;
grant select, insert, update, delete on public.patients             to authenticated;
grant select, insert, update, delete on public.prescription_library to authenticated;
grant select, insert, update, delete on public.prescriptions        to authenticated;
grant select, insert, update, delete on public.profiles             to authenticated;

-- conjuntos menores, conforme as políticas existentes
grant select, insert, delete on public.messages        to authenticated;
grant select, insert         on public.note_versions   to authenticated;
grant select, update         on public.referrals       to authenticated;
grant select, delete         on public.security_events to authenticated;
grant select                 on public.rate_limits     to authenticated;
grant select                 on public.referral_codes  to authenticated;

-- Edge Functions (service role)
grant all on public.cases, public.conversations, public.courtesy_access,
             public.evidences, public.exam_requests, public.medical_documents,
             public.messages, public.note_versions, public.notes,
             public.notifications, public.patients, public.prescription_library,
             public.prescriptions, public.profiles, public.rate_limits,
             public.referral_codes, public.referrals, public.security_events
  to service_role;

commit;
