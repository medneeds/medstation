import { useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth check error:", error);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      
      // If session exists but might be expired, try to refresh it
      if (session) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("User validation failed:", userError);
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            console.error("Session refresh failed:", refreshError);
            setAuthenticated(false);
          } else {
            setAuthenticated(true);
          }
        } else {
          setAuthenticated(true);
        }
      } else {
        setAuthenticated(false);
      }
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
      console.log("Auth state changed:", event);
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
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
