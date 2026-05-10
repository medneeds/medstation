import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AvailableUpgrade = "consultorio_upgrade" | "agents_upgrade" | null;

interface SubscriptionContextType {
  subscribed: boolean;
  productId: string | null;
  productIds: string[];
  subscriptionEnd: string | null;
  hasAgents: boolean;
  hasConsultorio: boolean;
  availableUpgrade: AvailableUpgrade;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [hasAgents, setHasAgents] = useState(false);
  const [hasConsultorio, setHasConsultorio] = useState(false);
  const [availableUpgrade, setAvailableUpgrade] = useState<AvailableUpgrade>(null);
  const [loading, setLoading] = useState(true);

  const reset = () => {
    setSubscribed(false);
    setProductId(null);
    setProductIds([]);
    setSubscriptionEnd(null);
    setHasAgents(false);
    setHasConsultorio(false);
    setAvailableUpgrade(null);
  };

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        reset();
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setSubscribed(data?.subscribed === true);
      setProductId(data?.product_id || null);
      setProductIds(data?.product_ids || []);
      setSubscriptionEnd(data?.subscription_end || null);
      setHasAgents(data?.has_agents === true);
      setHasConsultorio(data?.has_consultorio === true);
      setAvailableUpgrade((data?.available_upgrade as AvailableUpgrade) || null);
    } catch (error) {
      console.error("[SubscriptionContext] Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkSubscription();
      } else {
        reset();
        setLoading(false);
      }
    });
    const interval = setInterval(checkSubscription, 60000);
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscribed,
      productId,
      productIds,
      subscriptionEnd,
      hasAgents,
      hasConsultorio,
      availableUpgrade,
      loading,
      checkSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
