import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail } from "../_shared/admin-users.ts";
import { resolveSubscriptionEnd, type MinimalSubscription } from "../_shared/stripe-access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const s = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-SYNC-SUBS] ${step}${s}`);
};

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function monthlyCents(price: Stripe.Price | undefined, quantity = 1): number | null {
  if (!price?.unit_amount || !price.recurring) return null;
  const amount = price.unit_amount * quantity;
  const { interval, interval_count = 1 } = price.recurring;
  const monthly = interval === "year"
    ? amount / (12 * interval_count)
    : interval === "week"
      ? (amount * 52) / (12 * interval_count)
      : interval === "day"
        ? (amount * 365) / (12 * interval_count)
        : amount / interval_count;
  return Math.round(monthly);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden: staff access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const url = new URL(req.url);
    // Read-only preview: audits the divergence without writing to the mirror.
    const dryRun = url.searchParams.get("dryRun") === "true";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // 1. Pull every subscription from Stripe (read-only, never mutates Stripe).
    const subscriptions: Stripe.Subscription[] = [];
    for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      subscriptions.push(sub as Stripe.Subscription);
    }
    log("stripe subscriptions fetched", { count: subscriptions.length });

    // 2. Cache existing mirror rows so we never overwrite a known user_id with null.
    const { data: existingRows, error: existingError } = await supabase
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, user_id, past_due_since");
    if (existingError) throw new Error(`Failed to read mirror: ${existingError.message}`);
    const existing = new Map(
      (existingRows ?? []).map((r) => [r.stripe_subscription_id as string, r]),
    );

    // 3. Resolve user ids the same way the webhook does: metadata first, then customer email.
    const customerCache = new Map<string, string | null>();
    const emailCache = new Map<string, string | null>();

    const resolveUserId = async (sub: Stripe.Subscription): Promise<string | null> => {
      const metadataUserId = sub.metadata?.user_id?.trim();
      if (metadataUserId) return metadataUserId;

      const customerId = objectId(sub.customer);
      if (!customerId) return null;

      if (!customerCache.has(customerId)) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          customerCache.set(
            customerId,
            "deleted" in customer && customer.deleted ? null : (customer as Stripe.Customer).email ?? null,
          );
        } catch {
          customerCache.set(customerId, null);
        }
      }
      const email = customerCache.get(customerId) ?? null;
      if (!email) return null;

      const key = email.toLowerCase();
      if (!emailCache.has(key)) {
        const found = await findUserByEmail(
          (params) => supabase.auth.admin.listUsers(params) as never,
          email,
        );
        emailCache.set(key, found?.id ?? null);
      }
      return emailCache.get(key) ?? null;
    };

    const nowIso = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];
    const byStatus: Record<string, number> = {};
    const activeByCustomer = new Map<string, number>();
    let withoutUserId = 0;
    let noCustomer = 0;

    for (const sub of subscriptions) {
      const customerId = objectId(sub.customer);
      if (!customerId) {
        noCustomer += 1;
        continue;
      }

      byStatus[sub.status] = (byStatus[sub.status] ?? 0) + 1;
      if (sub.status === "active") {
        activeByCustomer.set(customerId, (activeByCustomer.get(customerId) ?? 0) + 1);
      }

      const prev = existing.get(sub.id);
      const resolved = await resolveUserId(sub);
      const userId = resolved ?? prev?.user_id ?? null;
      if (!userId) withoutUserId += 1;

      const firstItem = sub.items?.data?.[0];
      const price = firstItem?.price;
      const product = price?.product;
      const item = firstItem as unknown as { current_period_start?: number | null } | undefined;
      const periodStart = (sub as unknown as { current_period_start?: number | null }).current_period_start
        ?? item?.current_period_start
        ?? null;

      rows.push({
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        user_id: userId,
        status: sub.status,
        price_id: price?.id ?? null,
        product_id: typeof product === "string" ? product : product?.id ?? null,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: resolveSubscriptionEnd(sub as unknown as MinimalSubscription),
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        billing_interval: price?.recurring?.interval ?? null,
        currency: sub.currency ?? price?.currency ?? null,
        monthly_amount_cents: monthlyCents(price, firstItem?.quantity ?? 1),
        // past_due_since is owned by the webhook: keep whatever it already recorded.
        past_due_since: sub.status === "past_due" ? prev?.past_due_since ?? nowIso : null,
        updated_at: nowIso,
        synced_at: nowIso,
      });
    }

    let synced = 0;
    if (!dryRun && rows.length) {
      // Idempotent: primary key is stripe_subscription_id, so re-running just refreshes.
      const { error: upsertError } = await supabase
        .from("stripe_subscriptions")
        .upsert(rows, { onConflict: "stripe_subscription_id" });
      if (upsertError) throw new Error(`Failed to upsert mirror: ${upsertError.message}`);
      synced = rows.length;
    }

    const { data: mirrorRows } = await supabase
      .from("stripe_subscriptions")
      .select("status, user_id");
    const mirrorByStatus: Record<string, number> = {};
    for (const r of mirrorRows ?? []) {
      mirrorByStatus[r.status as string] = (mirrorByStatus[r.status as string] ?? 0) + 1;
    }

    const duplicateActiveCustomers = [...activeByCustomer.values()].filter((n) => n > 1).length;

    return new Response(
      JSON.stringify({
        dryRun,
        generatedAt: nowIso,
        stripe: { total: subscriptions.length, byStatus, withoutCustomer: noCustomer },
        mirror: {
          total: (mirrorRows ?? []).length,
          byStatus: mirrorByStatus,
          withoutUserId: (mirrorRows ?? []).filter((r) => !r.user_id).length,
        },
        synced,
        unresolvedUserIds: withoutUserId,
        duplicateActiveCustomers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
