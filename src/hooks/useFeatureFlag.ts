import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureFlag(key: string, defaultValue = false) {
  const [enabled, setEnabled] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("feature_flags")
          .select("*")
          .eq("key", key)
          .maybeSingle();
        if (!mounted) return;
        if (error || !data) { setEnabled(defaultValue); setLoading(false); return; }
        const uid = user?.id;
        if (uid && data.disabled_users?.includes(uid)) setEnabled(false);
        else if (uid && data.enabled_users?.includes(uid)) setEnabled(true);
        else if (data.enabled_global) setEnabled(true);
        else if (data.rollout_pct > 0 && uid) {
          const hash = [...uid].reduce((a, c) => a + c.charCodeAt(0), 0);
          setEnabled((hash % 100) < data.rollout_pct);
        } else setEnabled(defaultValue);
      } catch { if (mounted) setEnabled(defaultValue); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [key, defaultValue]);

  return { enabled, loading };
}
