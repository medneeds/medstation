import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail } from "../_shared/admin-users.ts";
import { resolveSubscriptionEnd, type MinimalSubscription } from "../_shared/stripe-access.ts";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";
import {
  computeAnnualAccessWindow,
  shouldGrantAnnualAccess,
  type MinimalCheckoutSession,
} from "../_shared/annual-purchase.ts";

const BILLING_RECOVERY_URL = "https://medstation-ai.com.br/settings";
const STALE_PROCESSING_MS = 5 * 60 * 1000;

type WebhookStatus = "processing" | "processed" | "failed";

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id;
  }
  return null;
}

function invoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  const legacy = objectId(invoice.subscription);
  if (legacy) return legacy;
  const parent = invoice.parent as Record<string, unknown> | undefined;
  const details = parent?.subscription_details as Record<string, unknown> | undefined;
  return objectId(details?.subscription);
}

async function resolveUserId(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataUserId = subscription.metadata?.user_id?.trim();
  if (metadataUserId) return metadataUserId;

  const customerId = objectId(subscription.customer);
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return null;

  const existing = await findUserByEmail(
    (params) => supabase.auth.admin.listUsers(params) as any,
    customer.email,
  );
  return existing?.id ?? null;
}

async function syncSubscription(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = objectId(subscription.customer);
  if (!customerId) throw new Error("Subscription has no customer id");

  const resolvedUserId = await resolveUserId(supabase, stripe, subscription);
  const { data: existing } = await supabase
    .from("stripe_subscriptions")
    .select("past_due_since, user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  const userId = resolvedUserId ?? existing?.user_id ?? null;

  const nowIso = new Date().toISOString();
  const status = subscription.status;
  const pastDueSince = status === "past_due"
    ? existing?.past_due_since ?? nowIso
    : null;

  const firstItem = subscription.items?.data?.[0];
  const price = firstItem?.price;
  const product = price?.product;
  const productId = typeof product === "string" ? product : product?.id ?? null;
  const item = firstItem as unknown as { current_period_start?: number | null } | undefined;
  const periodStart = (subscription as unknown as { current_period_start?: number | null }).current_period_start
    ?? item?.current_period_start
    ?? null;

  // Keep the mirror columns filled incrementally so the admin backfill stays a
  // recovery tool, not a dependency.
  const monthlyAmountCents = (() => {
    if (!price?.unit_amount || !price.recurring) return null;
    const amount = price.unit_amount * (firstItem?.quantity ?? 1);
    const { interval, interval_count = 1 } = price.recurring;
    const monthly = interval === "year"
      ? amount / (12 * interval_count)
      : interval === "week"
        ? (amount * 52) / (12 * interval_count)
        : interval === "day"
          ? (amount * 365) / (12 * interval_count)
          : amount / interval_count;
    return Math.round(monthly);
  })();

  const { error } = await supabase.from("stripe_subscriptions").upsert({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    user_id: userId,
    status,
    price_id: price?.id ?? null,
    product_id: productId,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    billing_interval: price?.recurring?.interval ?? null,
    currency: subscription.currency ?? price?.currency ?? null,
    monthly_amount_cents: monthlyAmountCents,
    synced_at: nowIso,
    current_period_end: resolveSubscriptionEnd(subscription as unknown as MinimalSubscription),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    past_due_since: pastDueSince,
    last_event_id: eventId,
    updated_at: nowIso,
  }, { onConflict: "stripe_subscription_id" });

  if (error) throw new Error(`Failed to persist subscription: ${error.message}`);
  return { userId, customerId };
}

/**
 * Compra anual one-time (cartão ou Pix). Idempotente: a unicidade de
 * `checkout_session_id` garante que a reentrega do mesmo evento nunca conceda
 * 12 meses duas vezes.
 */
async function grantAnnualAccess(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const { data: already } = await supabase
    .from("stripe_one_time_purchases")
    .select("id")
    .eq("checkout_session_id", session.id)
    .maybeSingle();
  if (already) return { granted: false, reason: "already_processed" };

  const customerId = objectId(session.customer);
  const email = session.customer_details?.email
    ?? session.customer_email
    ?? await getCustomerEmail(stripe, customerId);

  let userId = session.metadata?.user_id?.trim() || null;
  if (!userId && email) {
    const existing = await findUserByEmail(
      (params) => supabase.auth.admin.listUsers(params) as any,
      email,
    );
    userId = existing?.id ?? null;
  }

  // Extensão determinística: nova compra começa em max(agora, fim do acesso atual).
  let currentAccessEnd: string | null = null;
  if (userId) {
    const { data: latest } = await supabase
      .from("stripe_one_time_purchases")
      .select("access_end")
      .eq("user_id", userId)
      .eq("status", "paid")
      .order("access_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    currentAccessEnd = latest?.access_end ?? null;
  }

  const paidAt = new Date();
  const { accessStart, accessEnd } = computeAnnualAccessWindow(paidAt, currentAccessEnd);

  const { error } = await supabase.from("stripe_one_time_purchases").insert({
    checkout_session_id: session.id,
    payment_intent_id: objectId(session.payment_intent),
    stripe_customer_id: customerId,
    user_id: userId,
    email: email ?? null,
    plan: session.metadata?.plan ?? "pro_completo_yearly",
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    status: "paid",
    paid_at: paidAt.toISOString(),
    access_start: accessStart,
    access_end: accessEnd,
    last_event_id: eventId,
  });

  if (error) {
    // Violação de unicidade = evento concorrente/reentregue: nada a fazer.
    if (error.code === "23505") return { granted: false, reason: "duplicate" };
    throw new Error(`Failed to persist annual purchase: ${error.message}`);
  }

  if (userId) {
    await supabase.from("user_access")
      .update({ paid_access_until: accessEnd })
      .eq("user_id", userId);
  }

  return { granted: true, accessEnd };
}

async function recordAnnualFailure(
  supabase: ReturnType<typeof serviceClient>,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  await supabase.from("stripe_one_time_purchases").upsert({
    checkout_session_id: session.id,
    payment_intent_id: objectId(session.payment_intent),
    stripe_customer_id: objectId(session.customer),
    email: session.customer_details?.email ?? session.customer_email ?? null,
    plan: session.metadata?.plan ?? "pro_completo_yearly",
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
    status: "failed",
    last_event_id: eventId,
  }, { onConflict: "checkout_session_id", ignoreDuplicates: true });
}

async function getCustomerEmail(stripe: Stripe, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.email ?? null;
}

async function claimWebhook(
  supabase: ReturnType<typeof serviceClient>,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    status: "processing",
    attempts: 1,
    last_error: null,
    processed_at: null,
    updated_at: nowIso,
  });

  if (!insertError) return true;
  if (insertError.code !== "23505") {
    throw new Error(`Failed to claim webhook event: ${insertError.message}`);
  }

  const { data: existing, error: readError } = await supabase
    .from("stripe_webhook_events")
    .select("status, attempts, updated_at")
    .eq("stripe_event_id", eventId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to read webhook claim: ${readError.message}`);
  if (!existing || existing.status === "processed") return false;

  const isStaleProcessing = existing.status === "processing"
    && Date.now() - new Date(existing.updated_at).getTime() > STALE_PROCESSING_MS;
  if (existing.status === "processing" && !isStaleProcessing) return false;

  const expectedStatus = existing.status as Extract<WebhookStatus, "processing" | "failed">;
  let reclaim = supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempts: (existing.attempts ?? 0) + 1,
      last_error: null,
      processed_at: null,
      updated_at: nowIso,
    })
    .eq("stripe_event_id", eventId)
    .eq("status", expectedStatus);

  // For stale in-flight events, compare the observed timestamp as an optimistic lock.
  if (isStaleProcessing) reclaim = reclaim.eq("updated_at", existing.updated_at);

  const { data: reclaimed, error: reclaimError } = await reclaim
    .select("stripe_event_id")
    .maybeSingle();

  if (reclaimError) throw new Error(`Failed to reclaim webhook event: ${reclaimError.message}`);
  return Boolean(reclaimed);
}

async function finishWebhook(
  supabase: ReturnType<typeof serviceClient>,
  eventId: string,
  status: Extract<WebhookStatus, "processed" | "failed">,
  errorMessage: string | null = null,
) {
  const { error } = await supabase.from("stripe_webhook_events").update({
    status,
    last_error: errorMessage?.slice(0, 1000) ?? null,
    processed_at: status === "processed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("stripe_event_id", eventId);

  if (error) throw new Error(`Failed to finish webhook event: ${error.message}`);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!webhookSecret || !stripeKey) {
    console.error("[stripe-webhook] Required Stripe secrets are not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  const rawBody = await req.text();
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, undefined, cryptoProvider);
  } catch (error) {
    console.error("[stripe-webhook] Invalid signature", (error as Error)?.message);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = serviceClient();

  try {
    const claimed = await claimWebhook(supabase, event.id, event.type);
    if (!claimed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(supabase, stripe, event.data.object as Stripe.Subscription, event.id);
        break;
      }
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = objectId(session.subscription);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, stripe, subscription, event.id);
          break;
        }
        if (shouldGrantAnnualAccess(event.type, session as unknown as MinimalCheckoutSession)) {
          const result = await grantAnnualAccess(supabase, stripe, session, event.id);
          console.log("[stripe-webhook] annual access", { type: event.type, ...result });
        } else {
          console.log("[stripe-webhook] annual payment not confirmed yet", {
            type: event.type,
            payment_status: session.payment_status,
          });
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment") await recordAnnualFailure(supabase, session, event.id);
        break;
      }
      case "invoice.payment_failed":
      case "invoice.payment_action_required": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const invoiceId = typeof invoice.id === "string" ? invoice.id : event.id;
        const subscriptionId = invoiceSubscriptionId(invoice);
        let customerId = objectId(invoice.customer);
        let userId: string | null = null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const synced = await syncSubscription(supabase, stripe, subscription, event.id);
          customerId = synced.customerId;
          userId = synced.userId;
          await supabase.from("stripe_subscriptions").update({
            last_payment_failed_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subscriptionId);
        }

        const email = await getCustomerEmail(stripe, customerId);
        if (email) {
          let name: string | undefined;
          if (userId) {
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
            name = profile?.full_name ?? undefined;
          }
          await sendTemplateEmailWithLog("payment-failed", email, {
            templateData: { name, billingUrl: BILLING_RECOVERY_URL },
            idempotencyKey: `stripe:invoice:${invoiceId}:payment-recovery`,
          });
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, stripe, subscription, event.id);
          await supabase.from("stripe_subscriptions").update({
            past_due_since: null,
            last_payment_succeeded_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }
      default:
        break;
    }

    await finishWebhook(supabase, event.id, "processed");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook] Processing failed", { type: event.type, message });
    try {
      await finishWebhook(supabase, event.id, "failed", message);
    } catch {
      // Preserve the original failure so Stripe retries the event.
    }
    return new Response("Webhook processing failed", { status: 500 });
  }
});
