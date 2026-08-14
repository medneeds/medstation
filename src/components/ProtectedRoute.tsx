import { useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  // Auto logout após 30 minutos de inatividade
  useInactivityLogout(authenticated);

  const checkAuth = useCallback(async () => {
    try {
      // Apenas lê a sessão local. O cliente Supabase já renova o token
      // automaticamente (autoRefreshToken) — chamar refreshSession()/getUser()
      // aqui gerava rajadas simultâneas de /token e /user e estourava o
      // rate limit (429), derrubando a sessão do usuário.
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth check error:", error);
        setAuthenticated(false);
        return;
      }

      setAuthenticated(!!session);
    } catch (err) {
      console.error("Unexpected auth error:", err);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setAuthenticated(!!session);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAuth]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!authenticated) {
    // Preserve the attempted URL for redirect after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
