import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(key: string, defaultValue = false) {
  const [enabled, setEnabled] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Checagem via RPC segura — a tabela não expõe listas de usuários ao cliente.
        const { data, error } = await supabase.rpc("is_feature_enabled", { _key: key });
        if (!mounted) return;
        if (error || data === null || data === undefined) {
          setEnabled(defaultValue);
          setLoading(false);
          return;
        }
        setEnabled(Boolean(data));
      } catch { if (mounted) setEnabled(defaultValue); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [key, defaultValue]);

  return { enabled, loading };
}
