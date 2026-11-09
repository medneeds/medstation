CREATE TABLE public.prompt_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('assistant', 'prompt')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 20 AND 8000),
  category text NOT NULL DEFAULT 'outros',
  model text,
  author_name text NOT NULL DEFAULT '',
  author_specialty text NOT NULL DEFAULT '',
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  use_count integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prompt_library_items_visible_idx ON public.prompt_library_items (hidden, rating_avg DESC, created_at DESC);
CREATE INDEX prompt_library_items_author_idx ON public.prompt_library_items (author_id);

GRANT SELECT, DELETE ON public.prompt_library_items TO authenticated;
GRANT INSERT (author_id, kind, title, description, content, category, model) ON public.prompt_library_items TO authenticated;
GRANT UPDATE (kind, title, description, content, category, model) ON public.prompt_library_items TO authenticated;
GRANT ALL ON public.prompt_library_items TO service_role;
ALTER TABLE public.prompt_library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prompteca: ver publicados, os meus ou como equipe" ON public.prompt_library_items
  FOR SELECT TO authenticated
  USING (hidden = false OR author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Prompteca: publicar como eu" ON public.prompt_library_items
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Prompteca: editar os meus" ON public.prompt_library_items
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Prompteca: excluir os meus ou como equipe" ON public.prompt_library_items
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- Nome e especialidade do autor vêm do perfil, nunca do navegador.
CREATE OR REPLACE FUNCTION public.prompt_library_set_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT full_name, specialty, professional_status INTO p FROM public.profiles WHERE id = NEW.author_id;
  NEW.author_name := COALESCE(NULLIF(btrim(p.full_name), ''), 'Médico(a) MedStation');
  NEW.author_specialty := COALESCE(NULLIF(btrim(p.specialty), ''),
    CASE WHEN p.professional_status = 'intern' THEN 'Interno(a) de Medicina' ELSE 'Médico(a)' END);
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER prompt_library_set_author BEFORE INSERT OR UPDATE ON public.prompt_library_items
  FOR EACH ROW EXECUTE FUNCTION public.prompt_library_set_author();

CREATE TABLE public.prompt_library_ratings (
  item_id uuid NOT NULL REFERENCES public.prompt_library_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prompt_library_ratings TO authenticated;
GRANT ALL ON public.prompt_library_ratings TO service_role;
ALTER TABLE public.prompt_library_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prompteca: ver minhas avaliações" ON public.prompt_library_ratings
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Prompteca: avaliar de outros autores" ON public.prompt_library_ratings
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.prompt_library_items i WHERE i.id = item_id AND i.author_id <> auth.uid() AND i.hidden = false));
CREATE POLICY "Prompteca: mudar minha avaliação" ON public.prompt_library_ratings
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Prompteca: apagar minha avaliação" ON public.prompt_library_ratings
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prompt_library_refresh_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid := COALESCE(NEW.item_id, OLD.item_id);
BEGIN
  UPDATE public.prompt_library_items i SET
    rating_avg = COALESCE((SELECT round(avg(stars)::numeric, 2) FROM public.prompt_library_ratings WHERE item_id = target), 0),
    rating_count = (SELECT count(*) FROM public.prompt_library_ratings WHERE item_id = target)
  WHERE i.id = target;
  RETURN NULL;
END $$;
CREATE TRIGGER prompt_library_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON public.prompt_library_ratings
  FOR EACH ROW EXECUTE FUNCTION public.prompt_library_refresh_rating();

-- O trigger de autor não pode mexer em nota/uso quando o update vem do recálculo.
CREATE OR REPLACE FUNCTION public.prompt_library_count_use(p_item uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.prompt_library_items SET use_count = use_count + 1
  WHERE id = p_item AND hidden = false AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.prompt_library_count_use(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prompt_library_count_use(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prompt_library_set_hidden(p_item uuid, p_hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Somente a equipe MedStation'; END IF;
  UPDATE public.prompt_library_items SET hidden = p_hidden WHERE id = p_item;
END $$;
REVOKE ALL ON FUNCTION public.prompt_library_set_hidden(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prompt_library_set_hidden(uuid, boolean) TO authenticated;