CREATE OR REPLACE FUNCTION public.link_one_time_purchases_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_access_end timestamptz;
BEGIN
  BEGIN
    UPDATE public.stripe_one_time_purchases
       SET user_id = new.id,
           updated_at = now()
     WHERE user_id IS NULL
       AND email IS NOT NULL
       AND lower(email) = lower(new.email);

    SELECT max(access_end) INTO v_access_end
      FROM public.stripe_one_time_purchases
     WHERE user_id = new.id AND status = 'paid';

    IF v_access_end IS NOT NULL THEN
      UPDATE public.user_access
         SET paid_access_until = greatest(coalesce(paid_access_until, v_access_end), v_access_end),
             updated_at = now()
       WHERE user_id = new.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Nunca bloquear o cadastro por causa do vínculo da compra.
    NULL;
  END;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_purchases ON auth.users;
CREATE TRIGGER on_auth_user_created_link_purchases
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_one_time_purchases_on_signup();

-- Vincula compras já pagas antes da criação da conta.
UPDATE public.stripe_one_time_purchases p
   SET user_id = u.id, updated_at = now()
  FROM auth.users u
 WHERE p.user_id IS NULL
   AND p.email IS NOT NULL
   AND lower(p.email) = lower(u.email);

UPDATE public.user_access ua
   SET paid_access_until = x.access_end, updated_at = now()
  FROM (
    SELECT user_id, max(access_end) access_end
      FROM public.stripe_one_time_purchases
     WHERE status = 'paid' AND user_id IS NOT NULL
     GROUP BY user_id
  ) x
 WHERE ua.user_id = x.user_id
   AND (ua.paid_access_until IS NULL OR ua.paid_access_until < x.access_end);