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

// Simple in-memory cache (per edge function instance) - 5 minutes
let stripeCache: {
  customers: Map<string, any>; // email -> customer
  subscriptionsByCustomer: Map<string, any[]>; // customerId -> subscriptions
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAllStripeData(stripe: Stripe, force = false) {
  const now = Date.now();
  if (!force && stripeCache && now - stripeCache.fetchedAt < CACHE_TTL_MS) {
    log("Using cached Stripe data", {
      ageMs: now - stripeCache.fetchedAt,
      customers: stripeCache.customers.size,
    });
    return stripeCache;
  }

  log("Fetching fresh Stripe data");
  const customers = new Map<string, any>();
  const subscriptionsByCustomer = new Map<string, any[]>();

  // Paginate all customers
  let hasMore = true;
  let startingAfter: string | undefined;
  while (hasMore) {
    const page: any = await stripe.customers.list({
      limit: 100,
      starting_after: startingAfter,
    });
    for (const c of page.data) {
      if (c.email) customers.set(c.email.toLowerCase(), c);
    }
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }
  log("Customers fetched", { total: customers.size });

  // Paginate all subscriptions (all statuses)
  hasMore = true;
  startingAfter = undefined;
  while (hasMore) {
    const page: any = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
    });
    for (const s of page.data) {
      const cid = typeof s.customer === "string" ? s.customer : s.customer.id;
      if (!subscriptionsByCustomer.has(cid)) subscriptionsByCustomer.set(cid, []);
      subscriptionsByCustomer.get(cid)!.push(s);
    }
    hasMore = page.has_more;
    if (hasMore) startingAfter = page.data[page.data.length - 1].id;
  }
  log("Subscriptions fetched", { customers: subscriptionsByCustomer.size });

  stripeCache = { customers, subscriptionsByCustomer, fetchedAt: now };
  return stripeCache;
}

function getDisplayStatus(subs: any[] | undefined): {
  status: string;
  endDate: string | null;
  productIds: string[];
} {
  if (!subs || subs.length === 0) {
    return { status: "none", endDate: null, productIds: [] };
  }

  // Priority order
  const priority = ["active", "trialing", "past_due", "unpaid", "canceled", "incomplete", "incomplete_expired"];
  const sorted = [...subs].sort(
    (a, b) => priority.indexOf(a.status) - priority.indexOf(b.status)
  );
  const top = sorted[0];

  const productIds: string[] = [];
  for (const s of subs) {
    if (["active", "trialing", "past_due"].includes(s.status)) {
      for (const item of s.items.data) {
        const pid = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
        if (pid && !productIds.includes(pid)) productIds.push(pid);
      }
    }
  }

  let endDate: string | null = null;
  if (top.current_period_end) {
    try {
      endDate = new Date(top.current_period_end * 1000).toISOString();
    } catch {
      endDate = null;
    }
  }

  return { status: top.status, endDate, productIds };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
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
    const perPage = parseInt(url.searchParams.get("perPage") || "25", 10);
    const refresh = url.searchParams.get("refresh") === "true";

    log("Request params", { search, statusFilter, page, perPage, refresh });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all auth users (paginated)
    const allUsers: any[] = [];
    let pageNum = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: pageNum,
        perPage: 1000,
      });
      if (error) throw error;
      allUsers.push(...data.users);
      if (data.users.length < 1000) break;
      pageNum++;
    }
    log("Auth users fetched", { total: allUsers.length });

    // Fetch courtesy + admin role data
    const [courtesyRes, rolesRes, profilesRes] = await Promise.all([
      supabaseAdmin.from("courtesy_access").select("*"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, full_name, specialty"),
    ]);
    const courtesyMap = new Map(
      (courtesyRes.data || []).map((c: any) => [c.user_id, c])
    );
    const rolesMap = new Map<string, string[]>();
    for (const r of rolesRes.data || []) {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push(r.role);
    }
    const profilesMap = new Map(
      (profilesRes.data || []).map((p: any) => [p.id, p])
    );

    // Fetch Stripe data (with cache)
    const { customers, subscriptionsByCustomer } = await fetchAllStripeData(stripe, refresh);

    // Build records
    let records = allUsers.map((u: any) => {
      const email = (u.email || "").toLowerCase();
      const customer = customers.get(email);
      const subs = customer ? subscriptionsByCustomer.get(customer.id) : undefined;
      const stripeStatus = getDisplayStatus(subs);

      const courtesy = courtesyMap.get(u.id);
      const courtesyActive =
        courtesy && (!courtesy.expires_at || new Date(courtesy.expires_at) > new Date());

      const roles = rolesMap.get(u.id) || [];
      const isAdminUser = roles.includes("admin");
      const profile = profilesMap.get(u.id);

      // Effective status (priority: admin > courtesy > stripe)
      let effectiveStatus: string;
      if (isAdminUser) effectiveStatus = "admin";
      else if (courtesyActive) effectiveStatus = "courtesy";
      else effectiveStatus = stripeStatus.status;

      return {
        user_id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: profile?.full_name || null,
        specialty: profile?.specialty || null,
        is_admin: isAdminUser,
        stripe_customer_id: customer?.id || null,
        stripe_status: stripeStatus.status,
        stripe_product_ids: stripeStatus.productIds,
        subscription_end: stripeStatus.endDate,
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
    });

    // Filter
    if (search) {
      records = records.filter(
        (r) =>
          r.email?.toLowerCase().includes(search) ||
          r.full_name?.toLowerCase().includes(search)
      );
    }
    if (statusFilter !== "all") {
      records = records.filter((r) => r.effective_status === statusFilter);
    }

    // Sort by created_at DESC
    records.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    const total = records.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = records.slice(start, start + perPage);

    // Aggregate stats
    const stats = {
      total: allUsers.length,
      active: records.filter((r) => r.effective_status === "active").length,
      trialing: records.filter((r) => r.effective_status === "trialing").length,
      past_due: records.filter((r) => r.effective_status === "past_due").length,
      canceled: records.filter((r) => r.effective_status === "canceled").length,
      none: records.filter((r) => r.effective_status === "none").length,
      courtesy: records.filter((r) => r.effective_status === "courtesy").length,
      admin: records.filter((r) => r.effective_status === "admin").length,
    };

    return new Response(
      JSON.stringify({
        records: paginated,
        page,
        perPage,
        total,
        totalPages,
        stats,
        cacheAge: stripeCache ? Date.now() - stripeCache.fetchedAt : 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
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
