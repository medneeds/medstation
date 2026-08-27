import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type AccessStatus =
  | "admin"
  | "paid_active"
  | "past_due"
  | "courtesy_active"
  | "trial_active"
  | "trial_expired"
  | "none";

export type AccessResolution = {
  status: AccessStatus;
  canUsePlatform: boolean;
  isPaidSubscriber: boolean;
  isTrial: boolean;
  trialSource: "signup" | "migration" | "legacy" | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionEnd: string | null;
  productIds: string[];
  hasAgents: boolean;
  hasConsultorio: boolean;
};

const AGENTS_PRODUCT_IDS = new Set([
  "prod_TgR7u5urUle7om",
  "prod_UUfvAeta3d1Rn5",
  "prod_UUfw2uz4UPwkco",
  "prod_V4BACwTTBf5tBk",
  "prod_V4jGKeBPH2hGYg",
]);

const CONSULTORIO_PRODUCT_IDS = new Set([
  "prod_UUfuDkH9yfcfb3",
  "prod_UUfu9AzBtaGsCW",
  "prod_UUfw2uz4UPwkco",
  "prod_V4BACwTTBf5tBk",
  "prod_V4jGKeBPH2hGYg",
]);

function base(status: AccessStatus): AccessResolution {
  return {
    status,
    canUsePlatform: false,
    isPaidSubscriber: false,
    isTrial: false,
    trialSource: null,
    trialStartedAt: null,
    trialEndsAt: null,
    subscriptionEnd: null,
    productIds: [],
    hasAgents: false,
    hasConsultorio: false,
  };
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function stripeAccess(email: string): Promise<AccessResolution | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;

  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (!customers.data.length) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customers.data[0].id,
    status: "all",
    limit: 20,
  });

  const valid = subscriptions.data.filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status),
  );
  if (!valid.length) return null;

  const productIds: string[] = [];
  let subscriptionEnd: string | null = null;
  let hasHealthy = false;
  let hasPastDue = false;

  for (const subscription of valid) {
    if (subscription.status === "active" || subscription.status === "trialing") hasHealthy = true;
    if (subscription.status === "past_due") hasPastDue = true;

    for (const item of subscription.items.data) {
      const pid = item.price.product as string;
      if (pid && !productIds.includes(pid)) productIds.push(pid);
    }

    if (subscription.current_period_end) {
      const candidate = new Date(subscription.current_period_end * 1000).toISOString();
      if (!subscriptionEnd || candidate > subscriptionEnd) subscriptionEnd = candidate;
    }
  }

  const result = base(hasHealthy ? "paid_active" : hasPastDue ? "past_due" : "none");
  result.canUsePlatform = true; // Preserves current grace behavior for past_due.
  result.isPaidSubscriber = true;
  result.subscriptionEnd = subscriptionEnd;
  result.productIds = productIds;
  result.hasAgents = productIds.some((id) => AGENTS_PRODUCT_IDS.has(id));
  result.hasConsultorio = productIds.some((id) => CONSULTORIO_PRODUCT_IDS.has(id));
  return result;
}

export async function resolveUserAccess(user: Pick<User, "id" | "email" | "created_at">): Promise<AccessResolution> {
  const supabase = serviceClient();

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (isAdmin) {
    const result = base("admin");
    result.canUsePlatform = true;
    result.hasAgents = true;
    result.hasConsultorio = true;
    return result;
  }

  if (user.email) {
    const paid = await stripeAccess(user.email);
    if (paid) return paid;
  }

  const { data: hasCourtesy } = await supabase.rpc("has_active_courtesy", {
    _user_id: user.id,
  });
  if (hasCourtesy) {
    const { data: courtesy } = await supabase
      .from("courtesy_access")
      .select("expires_at, source")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const result = base("courtesy_active");
    result.canUsePlatform = true;
    result.hasAgents = true;
    result.hasConsultorio = true;
    result.trialEndsAt = courtesy?.expires_at ?? null;
    result.isTrial = courtesy?.source === "legacy_trial";
    result.trialSource = courtesy?.source === "legacy_trial" ? "legacy" : null;
    return result;
  }

  const { data: trial } = await supabase
    .from("user_access")
    .select("trial_started_at, trial_ends_at, trial_source")
    .eq("user_id", user.id)
    .maybeSingle();

  if (trial?.trial_ends_at) {
    const active = new Date(trial.trial_ends_at).getTime() > Date.now();
    const result = base(active ? "trial_active" : "trial_expired");
    result.canUsePlatform = active;
    result.isTrial = active;
    result.trialSource = trial.trial_source === "migration" ? "migration" : "signup";
    result.trialStartedAt = trial.trial_started_at;
    result.trialEndsAt = trial.trial_ends_at;
    result.hasAgents = active;
    result.hasConsultorio = active;
    return result;
  }

  // Temporary compatibility fallback while the migration rolls out.
  if (user.created_at) {
    const start = new Date(user.created_at).getTime();
    const end = start + 7 * 86400000;
    const active = end > Date.now();
    const result = base(active ? "trial_active" : "trial_expired");
    result.canUsePlatform = active;
    result.isTrial = active;
    result.trialSource = "migration";
    result.trialStartedAt = new Date(start).toISOString();
    result.trialEndsAt = new Date(end).toISOString();
    result.hasAgents = active;
    result.hasConsultorio = active;
    return result;
  }

  return base("none");
}

export async function getAuthenticatedUserAndAccess(req: Request) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) throw new Error("UNAUTHENTICATED");

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHENTICATED");

  const access = await resolveUserAccess(data.user);
  return { user: data.user, access };
}

export async function requirePlatformAccess(req: Request) {
  const resolved = await getAuthenticatedUserAndAccess(req);
  if (!resolved.access.canUsePlatform) {
    const error = new Error("ACCESS_REQUIRED");
    (error as Error & { access?: AccessResolution }).access = resolved.access;
    throw error;
  }
  return resolved;
}

export function accessDeniedResponse(access?: AccessResolution) {
  return new Response(
    JSON.stringify({
      error: "Seu período de acesso terminou. Assine a MedStation para continuar.",
      code: "ACCESS_REQUIRED",
      requiresSubscription: true,
      access_status: access?.status ?? "none",
      trial_ends_at: access?.trialEndsAt ?? null,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}
