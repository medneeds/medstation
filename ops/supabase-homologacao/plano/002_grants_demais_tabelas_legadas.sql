-- PLANO — NÃO APLICADO E FORA DESTA RODADA. Escrito pelo Claude em 24/11/2026.
--
-- Alvo: SOMENTE o projeto de homologação qcvvwbbeuvawgccstyro.
-- Fica fora de supabase/migrations e de drizzle/migrations de propósito.
--
-- Segunda fase, depois do 001 (que só libera a leitura do próprio perfil).
-- Cobre o restante das 18 tabelas criadas em 2025 sem GRANT explícito.
--
-- Regras:
--   * `authenticated` recebe só os comandos que as políticas da tabela preveem;
--   * `service_role` recebe select, insert, update e delete, listados um a um
--     (sem GRANT ALL, para a reversão poder ser exata);
--   * `anon` não recebe nada;
--   * nenhum privilégio que já existia (Dxtm) é concedido de novo.
--
-- Antes de aplicar: comparar com os privilégios reais da produção (consulta
-- somente leitura no README desta pasta). Sem essa comparação, isto é uma
-- proposta derivada das políticas, não um espelho da produção.
--
-- Reversão: 002_grants_demais_tabelas_legadas.rollback.sql (mesmas listas).

begin;

-- profiles: o SELECT vem do 001; aqui só a escrita do próprio perfil
grant insert, update, delete on public.profiles to authenticated;

-- políticas por usuário com leitura, inclusão, alteração e exclusão
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

-- conjuntos menores, conforme as políticas existentes
grant select, insert, delete on public.messages        to authenticated;
grant select, insert         on public.note_versions   to authenticated;
grant select, update         on public.referrals       to authenticated;
grant select, delete         on public.security_events to authenticated;
grant select                 on public.rate_limits     to authenticated;
grant select                 on public.referral_codes  to authenticated;

-- Edge Functions (service role)
grant select, insert, update, delete on
  public.cases, public.conversations, public.courtesy_access, public.evidences,
  public.exam_requests, public.medical_documents, public.messages,
  public.note_versions, public.notes, public.notifications, public.patients,
  public.prescription_library, public.prescriptions, public.profiles,
  public.rate_limits, public.referral_codes, public.referrals,
  public.security_events
to service_role;

commit;
