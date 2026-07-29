import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type StaffRole = "admin" | "support" | null;

export function useAdminRole() {
  const [role, setRole] = useState<StaffRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setRole(null); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!mounted) return;
      const roles = (data || []).map((r: any) => r.role);
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("support")) setRole("support");
      else setRole(null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return { role, isAdmin: role === "admin", isStaff: role === "admin" || role === "support", loading };
}
