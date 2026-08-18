
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, crm, crm_state)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    NULLIF(new.raw_user_meta_data->>'phone', ''),
    NULLIF(new.raw_user_meta_data->>'crm', ''),
    NULLIF(new.raw_user_meta_data->>'crm_state', '')
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_lead_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads
     SET converted_user_id = new.id,
         updated_at = now()
   WHERE converted_user_id IS NULL
     AND lower(email) = lower(new.email);
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_lead ON auth.users;
CREATE TRIGGER on_auth_user_created_link_lead
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_lead_on_signup();
