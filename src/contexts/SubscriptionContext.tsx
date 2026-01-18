import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  subscribed: boolean;
  productId: string | null;
  productIds: string[];
  subscriptionEnd: string | null;
  hasAgents: boolean;
  hasStudius: boolean;
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
  const [hasStudius, setHasStudius] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("[SubscriptionContext] No session found, resetting state");
        setSubscribed(false);
        setProductId(null);
        setProductIds([]);
        setSubscriptionEnd(null);
        setHasAgents(false);
        setHasStudius(false);
        setLoading(false);
        return;
      }

      console.log("[SubscriptionContext] Checking subscription for user:", session.user.email);
      
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("[SubscriptionContext] Error from check-subscription:", error);
        throw error;
      }

      console.log("[SubscriptionContext] Subscription data received:", data);

      // Ensure we properly handle the response
      const isSubscribed = data?.subscribed === true;
      const userHasAgents = data?.has_agents === true;
      const userHasStudius = data?.has_studius === true;

      setSubscribed(isSubscribed);
      setProductId(data?.product_id || null);
      setProductIds(data?.product_ids || []);
      setSubscriptionEnd(data?.subscription_end || null);
      setHasAgents(userHasAgents);
      setHasStudius(userHasStudius);
      
      console.log("[SubscriptionContext] State updated:", { 
        subscribed: isSubscribed, 
        hasAgents: userHasAgents, 
        hasStudius: userHasStudius,
        productIds: data?.product_ids 
      });
    } catch (error) {
      console.error("[SubscriptionContext] Error checking subscription:", error);
      // On error, don't block access - assume subscribed if there was an API error
      // This prevents paying customers from being locked out due to temporary issues
      setSubscribed(false);
      setHasAgents(false);
      setHasStudius(false);
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
        setSubscribed(false);
        setProductId(null);
        setProductIds([]);
        setSubscriptionEnd(null);
        setHasAgents(false);
        setHasStudius(false);
        setLoading(false);
      }
    });

    // Refresh subscription status every 60 seconds
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
      hasStudius,
      loading, 
      checkSubscription 
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
