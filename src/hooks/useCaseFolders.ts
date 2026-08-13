import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CaseFolder {
  id: string;
  name: string;
}

export function useCaseFolders() {
  const [folders, setFolders] = useState<CaseFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("case_folders")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      setFolders(data ?? []);
    } catch {
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createFolder = useCallback(async (name: string): Promise<CaseFolder | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada.");
      const existing = folders.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing;
      const { data, error } = await supabase
        .from("case_folders")
        .insert({ user_id: user.id, name: trimmed })
        .select("id, name")
        .single();
      if (error) throw error;
      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch {
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [folders]);

  return { folders, isLoading, isCreating, createFolder, reload: load };
}
