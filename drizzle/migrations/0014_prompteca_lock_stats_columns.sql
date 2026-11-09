REVOKE ALL ON public.prompt_library_items FROM anon;
REVOKE ALL ON public.prompt_library_ratings FROM anon;
REVOKE INSERT, UPDATE ON public.prompt_library_items FROM authenticated;
GRANT SELECT, DELETE ON public.prompt_library_items TO authenticated;
GRANT INSERT (author_id, kind, title, description, content, category, model) ON public.prompt_library_items TO authenticated;
GRANT UPDATE (kind, title, description, content, category, model) ON public.prompt_library_items TO authenticated;

CREATE OR REPLACE FUNCTION public.prompt_library_set_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT full_name, specialty, professional_status INTO p FROM public.profiles WHERE id = NEW.author_id;
  NEW.author_name := COALESCE(NULLIF(btrim(p.full_name), ''), 'Médico(a) MedStation');
  NEW.author_specialty := COALESCE(NULLIF(btrim(p.specialty), ''),
    CASE WHEN p.professional_status = 'intern' THEN 'Interno(a) de Medicina' ELSE 'Médico(a)' END);
  IF TG_OP = 'INSERT' THEN
    NEW.rating_avg := 0; NEW.rating_count := 0; NEW.use_count := 0; NEW.hidden := false;
    NEW.created_at := now(); NEW.updated_at := now();
  ELSE
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;