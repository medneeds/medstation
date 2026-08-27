import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AvailableUpgrade = "consultorio_upgrade" | "agents_upgrade" | null;
export type AccessStatus =
  | "admin"
  | "paid_active"
  | "past_due"
  | "courtesy_active"
  | "trial_active"
  | "trial_expired"
  | "none";

type TrialSource = "signup" | "migration" | "legacy" | null;

interface SubscriptionContextType {
  /** Legacy compatibility: use accessActive for new access-control code. */
  subscribed: boolean;
  accessActive: boolean;
  accessStatus: AccessStatus;
  accessVerificationError: boolean;
  isPaidSubscriber: boolean;
  productId: string | null;
  productIds: string[];
  subscriptionEnd: string | null;
  hasAgents: boolean;
  hasConsultorio: boolean;
  availableUpgrade: AvailableUpgrade;
  isTrial: boolean;
  trialSource: TrialSource;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [accessActive, setAccessActive] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("none");
  const [accessVerificationError, setAccessVerificationError] = useState(false);
  const [isPaidSubscriber, setIsPaidSubscriber] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [hasAgents, setHasAgents] = useState(false);
  const [hasConsultorio, setHasConsultorio] = useState(false);
  const [availableUpgrade, setAvailableUpgrade] = useState<AvailableUpgrade>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [trialSource, setTrialSource] = useState<TrialSource>(null);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reset = () => {
    setSubscribed(false);
    setAccessActive(false);
    setAccessStatus("none");
    setAccessVerificationError(false);
    setIsPaidSubscriber(false);
    setProductId(null);
    setProductIds([]);
    setSubscriptionEnd(null);
    setHasAgents(false);
    setHasConsultorio(false);
    setAvailableUpgrade(null);
    setIsTrial(false);
    setTrialSource(null);
    setTrialStartedAt(null);
    setTrialEndsAt(null);
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

      setAccessVerificationError(false);
      setSubscribed(data?.subscribed === true);
      setAccessActive(data?.access_active === true || data?.subscribed === true);
      setAccessStatus((data?.access_status as AccessStatus) || "none");
      setIsPaidSubscriber(data?.is_paid_subscriber === true);
      setProductId(data?.product_id || null);
      setProductIds(data?.product_ids || []);
      setSubscriptionEnd(data?.subscription_end || null);
      setHasAgents(data?.has_agents === true);
      setHasConsultorio(data?.has_consultorio === true);
      setAvailableUpgrade((data?.available_upgrade as AvailableUpgrade) || null);
      setIsTrial(data?.trial === true);
      setTrialSource((data?.trial_source as TrialSource) || null);
      setTrialStartedAt(data?.trial_started_at || null);
      setTrialEndsAt(data?.trial_ends_at || null);
    } catch (error) {
      // Do not turn a transient entitlement-verification outage into a sales
      // paywall. Preserve any last-known state and let the UI show a retry state.
      setAccessVerificationError(true);
      console.error("[SubscriptionContext] Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // TOKEN_REFRESHED occurs routinely. Rechecking entitlement here used to
      // create bursts of auth/Stripe calls and 429 risk.
      if (event === "TOKEN_REFRESHED") return;
      if (session) {
        checkSubscription();
      } else {
        reset();
        setLoading(false);
      }
    });
    const interval = setInterval(checkSubscription, 300000);
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscribed,
      accessActive,
      accessStatus,
      accessVerificationError,
      isPaidSubscriber,
      productId,
      productIds,
      subscriptionEnd,
      hasAgents,
      hasConsultorio,
      availableUpgrade,
      isTrial,
      trialSource,
      trialStartedAt,
      trialEndsAt,
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
