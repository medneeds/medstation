import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail } from "../_shared/admin-users.ts";
import { resolveSubscriptionEnd, type MinimalSubscription } from "../_shared/stripe-access.ts";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";

const BILLING_RECOVERY_URL = "https://medstation-ai.com.br/settings";

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

  const userId = await resolveUserId(supabase, stripe, subscription);
  const { data: existing } = await supabase
    .from("stripe_subscriptions")
    .select("past_due_since")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const status = subscription.status;
  const pastDueSince = status === "past_due"
    ? existing?.past_due_since ?? nowIso
    : null;

  const firstItem = subscription.items?.data?.[0];
  const product = firstItem?.price?.product;
  const productId = typeof product === "string" ? product : product?.id ?? null;

  const { error } = await supabase.from("stripe_subscriptions").upsert({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    user_id: userId,
    status,
    price_id: firstItem?.price?.id ?? null,
    product_id: productId,
    current_period_end: resolveSubscriptionEnd(subscription as unknown as MinimalSubscription),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    past_due_since: pastDueSince,
    last_event_id: eventId,
    updated_at: nowIso,
  }, { onConflict: "stripe_subscription_id" });

  if (error) throw new Error(`Failed to persist subscription: ${error.message}`);
  return { userId, customerId };
}

async function getCustomerEmail(stripe: Stripe, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.email ?? null;
}

async function markWebhook(
  supabase: ReturnType<typeof serviceClient>,
  eventId: string,
  eventType: string,
  status: "processing" | "processed" | "failed",
  errorMessage: string | null = null,
) {
  const { data: previous } = await supabase
    .from("stripe_webhook_events")
    .select("attempts")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  const { error } = await supabase.from("stripe_webhook_events").upsert({
    stripe_event_id: eventId,
    event_type: eventType,
    status,
    attempts: status === "processing" ? (previous?.attempts ?? 0) + 1 : previous?.attempts ?? 1,
    last_error: errorMessage?.slice(0, 1000) ?? null,
    processed_at: status === "processed" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_event_id" });

  if (error) throw new Error(`Failed to persist webhook event: ${error.message}`);
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
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (existing?.status === "processed") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    await markWebhook(supabase, event.id, event.type, "processing");

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(supabase, stripe, event.data.object as Stripe.Subscription, event.id);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = objectId(session.subscription);
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, stripe, subscription, event.id);
        }
        break;
      }
      case "invoice.payment_failed":
      case "invoice.payment_action_required": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
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
            idempotencyKey: `stripe:${event.id}:payment-failed`,
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

    await markWebhook(supabase, event.id, event.type, "processed");
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook] Processing failed", { type: event.type, message });
    try {
      await markWebhook(supabase, event.id, event.type, "failed", message);
    } catch {
      // Preserve the original failure so Stripe retries the event.
    }
    return new Response("Webhook processing failed", { status: 500 });
  }
});
