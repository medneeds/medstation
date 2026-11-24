-- REVERSÃO de 002_grants_demais_tabelas_legadas.sql — NÃO APLICADO.
-- Escrito pelo Claude em 24/11/2026. Alvo: somente a homologação.
--
-- Simétrica: cada REVOKE abaixo repete a lista do GRANT correspondente, para o
-- mesmo papel e a mesma tabela. Não usa REVOKE ALL. Por isso:
--   * os privilégios que já existiam antes (Dxtm) ficam como estavam;
--   * o SELECT de authenticated em profiles, que é do 001, NÃO é retirado aqui.

begin;

revoke insert, update, delete on public.profiles from authenticated;

revoke select, insert, update, delete on public.cases                from authenticated;
revoke select, insert, update, delete on public.conversations        from authenticated;
revoke select, insert, update, delete on public.courtesy_access      from authenticated;
revoke select, insert, update, delete on public.evidences            from authenticated;
revoke select, insert, update, delete on public.exam_requests        from authenticated;
revoke select, insert, update, delete on public.medical_documents    from authenticated;
revoke select, insert, update, delete on public.notes                from authenticated;
revoke select, insert, update, delete on public.notifications        from authenticated;
revoke select, insert, update, delete on public.patients             from authenticated;
revoke select, insert, update, delete on public.prescription_library from authenticated;
revoke select, insert, update, delete on public.prescriptions        from authenticated;

revoke select, insert, delete on public.messages        from authenticated;
revoke select, insert         on public.note_versions   from authenticated;
revoke select, update         on public.referrals       from authenticated;
revoke select, delete         on public.security_events from authenticated;
revoke select                 on public.rate_limits     from authenticated;
revoke select                 on public.referral_codes  from authenticated;

revoke select, insert, update, delete on
  public.cases, public.conversations, public.courtesy_access, public.evidences,
  public.exam_requests, public.medical_documents, public.messages,
  public.note_versions, public.notes, public.notifications, public.patients,
  public.prescription_library, public.prescriptions, public.profiles,
  public.rate_limits, public.referral_codes, public.referrals,
  public.security_events
from service_role;

commit;
