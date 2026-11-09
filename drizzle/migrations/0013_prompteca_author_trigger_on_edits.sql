DROP TRIGGER IF EXISTS prompt_library_set_author ON public.prompt_library_items;
CREATE TRIGGER prompt_library_set_author
  BEFORE INSERT OR UPDATE OF kind, title, description, content, category, model ON public.prompt_library_items
  FOR EACH ROW EXECUTE FUNCTION public.prompt_library_set_author();