CREATE TABLE public.vault_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id uuid REFERENCES public.vault_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_files TO authenticated;
GRANT ALL ON public.vault_files TO service_role;
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own vault files" ON public.vault_files FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER vault_files_updated_at BEFORE UPDATE ON public.vault_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vault_files_user ON public.vault_files(user_id, created_at DESC);

CREATE POLICY "Vault read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Vault upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Vault delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);