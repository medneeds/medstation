import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  identifyUser,
  initAnalytics,
  installFirstValueResponseTracker,
  resetAnalyticsIdentity,
  trackPageView,
} from "@/lib/analytics";

const INDEXABLE_PATHS = new Set(["/", "/pricing"]);

export function AnalyticsTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
    const uninstallFirstValueTracker = installFirstValueResponseTracker();

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) identifyUser(data.session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        identifyUser(session.user.id);
      } else if (event === "SIGNED_OUT") {
        resetAnalyticsIdentity();
      }
    });

    return () => {
      subscription.unsubscribe();
      uninstallFirstValueTracker();
    };
  }, []);

  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    void trackPageView(location.pathname);
  }, [location.pathname]);

  if (INDEXABLE_PATHS.has(location.pathname)) return null;

  return (
    <Helmet>
      <meta name="robots" content="noindex,nofollow,noarchive" />
      <meta name="googlebot" content="noindex,nofollow,noarchive" />
    </Helmet>
  );
}
