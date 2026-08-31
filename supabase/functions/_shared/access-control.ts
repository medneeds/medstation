import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { summarizeSubscriptions, type MinimalSubscription } from "./stripe-access.ts";

export type AccessStatus =
  | "admin"
  | "paid_active"
  | "past_due"
  | "courtesy_active"
  | "trial_active"
  | "trial_expired"
  | "verification_error"
  | "none";

export type PricingCohort = "current_unified" | "legacy_pre_unification" | null;


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
  pricingCohort: PricingCohort;
  legacyFullAccessUntil: string | null;
  pricingReviewDue: boolean;
  /** true when Stripe could not be reached and access came from other evidence. */
  billingCheckDegraded: boolean;
};


const CURRENT_UNIFIED_PRODUCT_ID = "prod_V4jGKeBPH2hGYg";

const LEGACY_PRODUCT_IDS = new Set([
  "prod_TgR7u5urUle7om", // Assistentes standalone
  "prod_UUfvAeta3d1Rn5", // Upgrade Assistentes
  "prod_UUfuDkH9yfcfb3", // Consultório / Modo Escuta standalone
  "prod_UUfu9AzBtaGsCW", // Upgrade Consultório
  "prod_UUfw2uz4UPwkco", // Pro 2 bundle legado
  "prod_V4BACwTTBf5tBk", // Pro Completo legado
]);

const AGENTS_PRODUCT_IDS = new Set([
  ...LEGACY_PRODUCT_IDS,
  CURRENT_UNIFIED_PRODUCT_ID,
]);

const CONSULTORIO_PRODUCT_IDS = new Set([
  "prod_UUfuDkH9yfcfb3",
  "prod_UUfu9AzBtaGsCW",
  "prod_UUfw2uz4UPwkco",
  "prod_V4BACwTTBf5tBk",
  CURRENT_UNIFIED_PRODUCT_ID,
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
    pricingCohort: null,
    legacyFullAccessUntil: null,
    pricingReviewDue: false,
    billingCheckDegraded: false,
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
  // Um mesmo e-mail pode ter mais de um customer no Stripe (checkout convidado,
  // e-mail alterado, duplicidade). Verificar apenas o primeiro bloqueava pagantes.
  const customers = await stripe.customers.list({ email, limit: 10 });
  if (!customers.data.length) return null;

  const collected: MinimalSubscription[] = [];
  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    collected.push(...(subscriptions.data as unknown as MinimalSubscription[]));
  }

  const summary = summarizeSubscriptions(collected);
  if (!summary) return null;

  const result = base(summary.hasHealthy ? "paid_active" : summary.hasPastDue ? "past_due" : "none");
  result.canUsePlatform = true;
  result.isPaidSubscriber = true;
  result.subscriptionEnd = summary.subscriptionEnd;
  result.productIds = summary.productIds;
  result.hasAgents = summary.productIds.some((id) => AGENTS_PRODUCT_IDS.has(id));
  result.hasConsultorio = summary.productIds.some((id) => CONSULTORIO_PRODUCT_IDS.has(id));
  return result;
}


/** Acesso anual comprado à vista (cartão ou Pix), fora do modelo de assinatura. */
async function annualPurchaseAccess(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  email: string | undefined,
): Promise<AccessResolution | null> {
  try {
    const filters = [`user_id.eq.${userId}`];
    if (email && /^[^,()]+$/.test(email)) filters.push(`email.eq.${email}`);
    const { data } = await supabase
      .from("stripe_one_time_purchases")
      .select("access_end")
      .eq("status", "paid")
      .or(filters.join(","))
      .order("access_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const accessEnd = data?.access_end ?? null;
    if (!accessEnd || new Date(accessEnd).getTime() <= Date.now()) return null;

    const result = base("paid_active");
    result.canUsePlatform = true;
    result.isPaidSubscriber = true;
    result.subscriptionEnd = accessEnd;
    result.productIds = [CURRENT_UNIFIED_PRODUCT_ID];
    result.hasAgents = true;
    result.hasConsultorio = true;
    result.pricingCohort = "current_unified";
    return result;
  } catch {
    return null;
  }
}

async function applyCommercialPolicy(
  supabase: ReturnType<typeof serviceClient>,
  paid: AccessResolution,
): Promise<AccessResolution> {
  if (paid.productIds.includes(CURRENT_UNIFIED_PRODUCT_ID)) {
    paid.pricingCohort = "current_unified";
    paid.hasAgents = true;
    paid.hasConsultorio = true;
    return paid;
  }

  const isLegacy = paid.productIds.some((id) => LEGACY_PRODUCT_IDS.has(id));
  if (!isLegacy) return paid;

  paid.pricingCohort = "legacy_pre_unification";

  const { data: policy } = await supabase
    .from("commercial_policy")
    .select("legacy_full_access_until")
    .eq("id", "medstation_unified_2026")
    .maybeSingle();

  paid.legacyFullAccessUntil = policy?.legacy_full_access_until ?? null;
  paid.pricingReviewDue = !!paid.legacyFullAccessUntil
    && new Date(paid.legacyFullAccessUntil).getTime() <= Date.now();

  // Legacy subscribers receive the whole platform during the protection period.
  // After the review date we DO NOT alter price or revoke features automatically;
  // the account is flagged for an explicit commercial decision in Admin.
  paid.hasAgents = true;
  paid.hasConsultorio = true;
  return paid;
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

  const annual = await annualPurchaseAccess(supabase, user.id, user.email ?? undefined);
  if (annual) return annual;

  let billingDegraded = false;
  if (user.email) {
    try {
      const paid = await stripeAccess(user.email);
      if (paid) return applyCommercialPolicy(supabase, paid);
    } catch (err) {
      // Falha temporária da Stripe NÃO pode virar paywall automaticamente.
      // Seguimos para cortesia/trial persistido e só sinalizamos erro se não
      // houver nenhuma outra evidência de acesso. Sem PII no log.
      billingDegraded = true;
      console.error("[access-control] Stripe lookup failed", (err as Error)?.message);
    }
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

  // A tabela user_access pode ainda não existir em produção (migration pendente).
  // Qualquer erro aqui é tolerado e caímos no fallback por created_at.
  let trial: { trial_started_at: string | null; trial_ends_at: string | null; trial_source: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("user_access")
      .select("trial_started_at, trial_ends_at, trial_source")
      .eq("user_id", user.id)
      .maybeSingle();
    trial = data ?? null;
  } catch {
    trial = null;
  }

  if (trial?.trial_ends_at) {
    const active = new Date(trial.trial_ends_at).getTime() > Date.now();
    const result = base(active ? "trial_active" : (billingDegraded ? "verification_error" : "trial_expired"));
    result.canUsePlatform = active;
    result.isTrial = active;
    result.trialSource = trial.trial_source === "migration" ? "migration" : "signup";
    result.trialStartedAt = trial.trial_started_at;
    result.trialEndsAt = trial.trial_ends_at;
    result.hasAgents = active;
    result.hasConsultorio = active;
    result.billingCheckDegraded = billingDegraded;
    return result;
  }

  if (user.created_at) {
    const start = new Date(user.created_at).getTime();
    const end = start + 7 * 86400000;
    const active = end > Date.now();
    const result = base(active ? "trial_active" : (billingDegraded ? "verification_error" : "trial_expired"));
    result.canUsePlatform = active;
    result.isTrial = active;
    result.trialSource = "migration";
    result.trialStartedAt = new Date(start).toISOString();
    result.trialEndsAt = new Date(end).toISOString();
    result.hasAgents = active;
    result.hasConsultorio = active;
    result.billingCheckDegraded = billingDegraded;
    return result;
  }

  const fallback = base(billingDegraded ? "verification_error" : "none");
  fallback.billingCheckDegraded = billingDegraded;
  return fallback;

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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json",
      },
    },
  );
}
