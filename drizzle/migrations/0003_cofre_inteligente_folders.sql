CREATE TABLE public.vault_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'green',
  is_favorite boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_folders TO authenticated;
GRANT ALL ON public.vault_folders TO service_role;
ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own vault folders" ON public.vault_folders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER vault_folders_updated_at BEFORE UPDATE ON public.vault_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vault_folders_user ON public.vault_folders(user_id, is_favorite DESC, sort_order);

ALTER TABLE public.notes ADD COLUMN folder_id uuid REFERENCES public.vault_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_notes_folder ON public.notes(folder_id);

INSERT INTO public.vault_folders (user_id, name, color)
SELECT DISTINCT user_id, 'Geral', 'gray' FROM public.notes;

UPDATE public.notes n SET folder_id = f.id
FROM public.vault_folders f
WHERE f.user_id = n.user_id AND f.name = 'Geral' AND n.folder_id IS NULL;