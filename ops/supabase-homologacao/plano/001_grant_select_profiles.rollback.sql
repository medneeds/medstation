-- REVERSÃO de 001_grant_select_profiles.sql — NÃO APLICADO.
-- Escrito pelo Claude em 24/11/2026. Alvo: somente a homologação.
--
-- Simétrica: retira exatamente o privilégio que o 001 concede, do mesmo papel,
-- na mesma tabela. Não usa REVOKE ALL, então os privilégios que já existiam
-- (Dxtm) ficam como estavam.

revoke select on public.profiles from authenticated;
