-- REVERSÃO de 001_grants_tabelas_legadas.sql — NÃO APLICADO.
-- Escrito pelo Claude em 24/11/2026. Alvo: somente a homologação
-- (qcvvwbbeuvawgccstyro). Devolve as 18 tabelas ao estado medido em
-- 24/11/2026: nenhum privilégio de dados para authenticated e service_role.

begin;

revoke select, insert, update, delete on
  public.cases, public.conversations, public.courtesy_access, public.evidences,
  public.exam_requests, public.medical_documents, public.messages,
  public.note_versions, public.notes, public.notifications, public.patients,
  public.prescription_library, public.prescriptions, public.profiles,
  public.rate_limits, public.referral_codes, public.referrals,
  public.security_events
from authenticated, service_role;

commit;
