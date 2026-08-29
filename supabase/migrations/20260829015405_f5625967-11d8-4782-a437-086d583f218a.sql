-- 1) Revogar EXECUTE de anon em função SECURITY DEFINER (guard interno já exige auth)
REVOKE EXECUTE ON FUNCTION public.get_public_referral_settings() FROM anon;

-- 2) user_roles: remover grants de escrita de roles (mudança de papel só via service role)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

-- 3) commercial_policy: leitura restrita a staff (dados comerciais internos)
DROP POLICY IF EXISTS "Authenticated users can read commercial policy" ON public.commercial_policy;
CREATE POLICY "Staff can read commercial policy"
ON public.commercial_policy
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 4) feature_flags: remover leitura ampla (expor enabled_users/disabled_users)
DROP POLICY IF EXISTS "Authenticated can read flags" ON public.feature_flags;

-- Função segura para checagem de flag sem expor listas de usuários
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f record;
  uid uuid := auth.uid();
  h int := 0;
BEGIN
  SELECT * INTO f FROM public.feature_flags WHERE key = _key;
  IF NOT FOUND THEN RETURN false; END IF;
  IF uid IS NOT NULL AND f.disabled_users @> ARRAY[uid] THEN RETURN false; END IF;
  IF uid IS NOT NULL AND f.enabled_users @> ARRAY[uid] THEN RETURN true; END IF;
  IF f.enabled_global THEN RETURN true; END IF;
  IF f.rollout_pct > 0 AND uid IS NOT NULL THEN
    SELECT COALESCE(SUM(ascii(c)), 0) INTO h FROM regexp_split_to_table(uid::text, '') AS c;
    RETURN (h % 100) < f.rollout_pct;
  END IF;
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_feature_enabled(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text) TO authenticated;