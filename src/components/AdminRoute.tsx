import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";

/**
 * Guard exclusivo do painel administrativo.
 * - Sem sessão → /admin/login (não usa a porta pública /auth).
 * - Sessão mas sem papel de staff → /dashboard (usuário comum).
 * - Staff sem privilégio de admin em rota adminOnly → volta a /admin.
 */
export function AdminRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const location = useLocation();
  const { isStaff, isAdmin, loading: roleLoading } = useAdminRole();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setAuthed(!!session);
      setAuthChecked(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      setAuthChecked(true);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!authChecked || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
