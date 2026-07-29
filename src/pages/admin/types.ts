// Shared admin panel types — single source of truth for all admin pages.

export interface CourtesyInfo {
  id: string;
  reason: string | null;
  expires_at: string | null;
  granted_by: string | null;
  created_at: string;
  active: boolean;
}

export interface SubscriberRecord {
  user_id: string | null;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  full_name: string | null;
  specialty: string | null;
  is_admin: boolean;
  stripe_customer_id: string | null;
  stripe_status: string;
  stripe_product_ids: string[];
  subscription_end: string | null;
  subscription_created: string | null;
  monthly_amount_cents: number;
  currency: string | null;
  interval: string | null;
  auth_missing: boolean;
  courtesy: CourtesyInfo | null;
  effective_status: string;
}

export interface SubscriberStats {
  total_users: number;
  total_records: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  none: number;
  courtesy: number;
  admin: number;
  auth_missing: number;
  mrr_cents: number;
  arr_cents: number;
  avg_ticket_cents: number;
  currency: string;
  paying_total: number;
}

export type FilteredSubscriberStats = SubscriberStats;

export interface SubscribersResponse {
  records: SubscriberRecord[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  stats: SubscriberStats;
  filteredStats: FilteredSubscriberStats;
  cacheAge: number;
}

// Global metrics for non-Stripe data (single source of truth)
export interface AdminMetrics {
  generated_at: string;
  courtesy: {
    total: number;
    active: number;
    expired: number;
  };
  feedback: {
    total: number;
    avg_rating: number;
    by_assistant: Array<{ assistant: string; count: number; avg: number }>;
  };
  referrals: {
    total: number;
    pending: number;
    qualified: number;
    rewarded: number;
    blocked: number;
    codes_generated: number;
    reward_days_total: number;
    conversion_rate: number;
  };
  support: {
    open: number;
    assigned: number;
    waiting_user: number;
    resolved_total: number;
    resolved_24h: number;
    total: number;
  };
  ai: {
    tokens_24h: number;
    tokens_30d: number;
    cost_24h_usd: number;
    cost_30d_usd: number;
    calls_24h: number;
    top_assistants_30d: Array<{ assistant: string; calls: number; tokens: number; cost_usd: number }>;
  };
  audit: {
    events_24h: number;
    events_7d: number;
    security_events_24h: number;
    security_events_7d: number;
  };
}
