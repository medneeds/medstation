import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-LIST-SUBSCRIBERS] ${step}${detailsStr}`);
};

let stripeCache: {
  customers: Map<string, any>;
  customersById: Map<string, any>;
  subscriptionsByCustomer: Map<string, any[]>;
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAllStripeData(stripe: Stripe, force = false) {
  const now = Date.now();
  if (!force && stripeCache && now - stripeCache.fetchedAt < CACHE_TTL_MS) {
    return stripeCache;
  }

  log("Fetching fresh Stripe data");
  const customers = new Map<string, any>();
  const customersById = new Map<string, any>();
  const subscriptionsByCustomer = new Map<string, any[]>();

  let hasMore = true;
  let startingAfter: string | undefined;
  while (hasMore) {
    const page: any = await stripe.customers.list({ limit: 100, starting_after: startingAfter });
    for (const c of page.data) {
      if (c.email) customers.set(c.email.toLowerCase(), c);
      customersById.set(c.id, c);
    }
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }

  hasMore = true;
  startingAfter = undefined;
  while (hasMore) {
    const page: any = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.items.data.price"],
    });
    for (const s of page.data) {
      const cid = typeof s.customer === "string" ? s.customer : s.customer.id;
      if (!subscriptionsByCustomer.has(cid)) subscriptionsByCustomer.set(cid, []);
      subscriptionsByCustomer.get(cid)!.push(s);
    }
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }
  log("Stripe data fetched", {
    customers: customers.size,
    customersById: customersById.size,
    subCustomers: subscriptionsByCustomer.size,
  });

  stripeCache = { customers, customersById, subscriptionsByCustomer, fetchedAt: now };
  return stripeCache;
}

// Normalize a price to a monthly amount (in cents)
function monthlyFromPrice(price: any, quantity = 1): number {
  if (!price?.unit_amount || !price?.recurring) return 0;
  const amount = price.unit_amount * quantity;
  const { interval, interval_count = 1 } = price.recurring;
  const perMonth =
    interval === "year"
      ? amount / (12 * interval_count)
      : interval === "week"
      ? (amount * 52) / (12 * interval_count)
      : interval === "day"
      ? (amount * 365) / (12 * interval_count)
      : amount / interval_count; // month
  return perMonth;
}

function summarize(subs: any[] | undefined) {
  if (!subs || subs.length === 0) {
    return {
      status: "none",
      endDate: null as string | null,
      productIds: [] as string[],
      monthlyAmountCents: 0,
      currency: null as string | null,
      currentSubCreated: null as string | null,
      interval: null as string | null,
    };
  }

  const priority = ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired"];
  const sorted = [...subs].sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
  const top = sorted[0];

  const productIds: string[] = [];
  let monthlyAmountCents = 0;
  let currency: string | null = null;
  let interval: string | null = null;

  for (const s of subs) {
    if (["active", "trialing", "past_due"].includes(s.status)) {
      for (const item of s.items.data) {
        const price = item.price;
        const pid = typeof price.product === "string" ? price.product : price.product.id;
        if (pid && !productIds.includes(pid)) productIds.push(pid);
        monthlyAmountCents += monthlyFromPrice(price, item.quantity || 1);
        if (!currency) currency = price.currency;
        if (!interval) interval = price.recurring?.interval || null;
      }
    }
  }

  let endDate: string | null = null;
  if (top.current_period_end) {
    try {
      endDate = new Date(top.current_period_end * 1000).toISOString();
    } catch { /* skip */ }
  }

  const currentSubCreated = top.created ? new Date(top.created * 1000).toISOString() : null;

  return {
    status: top.status,
    endDate,
    productIds,
    monthlyAmountCents: Math.round(monthlyAmountCents),
    currency,
    currentSubCreated,
    interval,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();
    const statusFilter = url.searchParams.get("status") || "all";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const perPage = parseInt(url.searchParams.get("perPage") || "100", 10);
    const refresh = url.searchParams.get("refresh") === "true";
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const allUsers: any[] = [];
    let pageNum = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: pageNum, perPage: 1000 });
      if (error) throw error;
      allUsers.push(...data.users);
      if (data.users.length < 1000) break;
      pageNum++;
    }

    const [courtesyRes, rolesRes, profilesRes] = await Promise.all([
      supabaseAdmin.from("courtesy_access").select("*"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, full_name, specialty"),
    ]);
    const courtesyMap = new Map((courtesyRes.data || []).map((c: any) => [c.user_id, c]));
    const rolesMap = new Map<string, string[]>();
    for (const r of rolesRes.data || []) {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    }
    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    const { customers, customersById, subscriptionsByCustomer } = await fetchAllStripeData(stripe, refresh);

    const usersByEmail = new Map<string, any>();
    for (const u of allUsers) {
      if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
    }

    // Build records: iterate every user AND every stripe customer that has subs (to catch missing/mismatched auth accounts)
    const buildRecord = (u: any | null, customer: any | null) => {
      const email = (u?.email || customer?.email || "").toLowerCase();
      const subs = customer ? subscriptionsByCustomer.get(customer.id) : undefined;
      const stripe = summarize(subs);

      const courtesy = u ? courtesyMap.get(u.id) : null;
      const courtesyActive = courtesy && (!courtesy.expires_at || new Date(courtesy.expires_at) > new Date());
      const roles = u ? (rolesMap.get(u.id) || []) : [];
      const isAdminUser = roles.includes("admin");
      const profile = u ? profilesMap.get(u.id) : null;

      let effectiveStatus: string;
      if (isAdminUser) effectiveStatus = "admin";
      else if (courtesyActive) effectiveStatus = "courtesy";
      else effectiveStatus = stripe.status;

      return {
        user_id: u?.id || null,
        email: u?.email || customer?.email || null,
        created_at: u?.created_at || null,
        last_sign_in_at: u?.last_sign_in_at || null,
        full_name: profile?.full_name || customer?.name || null,
        specialty: profile?.specialty || null,
        is_admin: isAdminUser,
        stripe_customer_id: customer?.id || null,
        stripe_status: stripe.status,
        stripe_product_ids: stripe.productIds,
        subscription_end: stripe.endDate,
        subscription_created: stripe.currentSubCreated,
        monthly_amount_cents: stripe.monthlyAmountCents,
        currency: stripe.currency,
        interval: stripe.interval,
        auth_missing: !u,
        courtesy: courtesy
          ? {
              id: courtesy.id,
              reason: courtesy.reason,
              expires_at: courtesy.expires_at,
              granted_by: courtesy.granted_by,
              created_at: courtesy.created_at,
              active: courtesyActive,
            }
          : null,
        effective_status: effectiveStatus,
      };
    };

    const records: any[] = allUsers.map((u: any) => {
      const email = (u.email || "").toLowerCase();
      const customer = customers.get(email) || null;
      return buildRecord(u, customer);
    });

    // Add stripe customers that don't map to any auth user (missing/mismatched account)
    const seenCustomerIds = new Set(records.filter((r) => r.stripe_customer_id).map((r) => r.stripe_customer_id));
    for (const [cid, subs] of subscriptionsByCustomer.entries()) {
      if (seenCustomerIds.has(cid)) continue;
      if (!subs || subs.length === 0) continue;
      const customer = customersById.get(cid);
      if (!customer) continue;
      records.push(buildRecord(null, customer));
    }

    // ---- GLOBAL stats (always computed on ALL records, ignoring search/status filter) ----
    // A user counts as "paying" whenever Stripe reports a real recurring status,
    // even if effective_status is overridden by admin/courtesy — otherwise
    // admin owners with real paid subs (e.g. Marcio Serra) disappear from MRR.
    const payingStatuses = new Set(["active", "trialing", "past_due"]);
    const payingAll = records.filter((r) => payingStatuses.has(r.stripe_status));
    const globalActive = records.filter((r) => r.stripe_status === "active");
    const globalTrialing = records.filter((r) => r.stripe_status === "trialing");
    const globalPastDue = records.filter((r) => r.stripe_status === "past_due");
    const globalCanceled = records.filter((r) => r.stripe_status === "canceled");
    const globalCourtesy = records.filter((r) => r.effective_status === "courtesy");
    const globalAdmin = records.filter((r) => r.is_admin);
    const globalNone = records.filter(
      (r) => r.stripe_status === "none" && !r.is_admin && r.effective_status !== "courtesy"
    );
    const globalMrrCents = payingAll.reduce((sum, r) => sum + (r.monthly_amount_cents || 0), 0);
    const globalCurrency = payingAll.find((r) => r.currency)?.currency || "brl";

    const stats = {
      total_users: allUsers.length,
      total_records: records.length,
      active: globalActive.length,
      trialing: globalTrialing.length,
      past_due: globalPastDue.length,
      canceled: globalCanceled.length,
      none: globalNone.length,
      courtesy: globalCourtesy.length,
      admin: globalAdmin.length,
      auth_missing: records.filter((r) => r.auth_missing).length,
      mrr_cents: Math.round(globalMrrCents),
      arr_cents: Math.round(globalMrrCents * 12),
      avg_ticket_cents: payingAll.length ? Math.round(globalMrrCents / payingAll.length) : 0,
      currency: globalCurrency,
      paying_total: payingAll.length,
    };

    // ---- Apply filters only to the returned records list (pagination/search) ----
    let filtered = records;
    if (search) {
      filtered = filtered.filter(
        (r) => r.email?.toLowerCase().includes(search) || r.full_name?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== "all") {
      const stripeStatusFilters = new Set(["active", "trialing", "past_due", "canceled"]);
      if (statusFilter === "paying") {
        filtered = filtered.filter((r) => payingStatuses.has(r.stripe_status));
      } else if (stripeStatusFilters.has(statusFilter)) {
        // Match real Stripe status so admins/courtesies with paid subs are included
        filtered = filtered.filter((r) => r.stripe_status === statusFilter);
      } else {
        filtered = filtered.filter((r) => r.effective_status === statusFilter);
      }
    }
    if (from || to) {
      filtered = filtered.filter((r) => {
        const ref = r.subscription_created || r.created_at;
        if (!ref) return false;
        const d = new Date(ref);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    filtered.sort(
      (a, b) => new Date(b.subscription_created || b.created_at || 0).getTime() -
                new Date(a.subscription_created || a.created_at || 0).getTime()
    );

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);

    // Per-filter stats (for contextual display when a filter is active)
    const filteredPaying = filtered.filter((r) => payingStatuses.has(r.stripe_status));
    const filteredMrr = filteredPaying.reduce((s, r) => s + (r.monthly_amount_cents || 0), 0);
    const filteredStats = {
      total: filtered.length,
      active: filtered.filter((r) => r.stripe_status === "active").length,
      trialing: filtered.filter((r) => r.stripe_status === "trialing").length,
      past_due: filtered.filter((r) => r.stripe_status === "past_due").length,
      canceled: filtered.filter((r) => r.stripe_status === "canceled").length,
      courtesy: filtered.filter((r) => r.effective_status === "courtesy").length,
      admin: filtered.filter((r) => r.is_admin).length,
      mrr_cents: Math.round(filteredMrr),
      paying: filteredPaying.length,
    };

    return new Response(
      JSON.stringify({
        records: paginated,
        page,
        perPage,
        total,
        totalPages,
        stats,
        filteredStats,
        cacheAge: stripeCache ? Date.now() - stripeCache.fetchedAt : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
