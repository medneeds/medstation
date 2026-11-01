import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail } from "../_shared/admin-users.ts";
import { resolveSubscriptionEnd, type MinimalSubscription } from "../_shared/stripe-access.ts";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";
import { notifyArsenalBonus } from "../_shared/arsenal-bonus.ts";
import { laterDate, planMonthlyHandoff, type MonthlySubLite } from "../_shared/annual-switch.ts";
import {
  computeAccessWindow,
  normalizePaymentMethod,
  planExcludesArsenalBonus,
  planFromSession,
  recoveryStatusForOutcome,
  shouldGrantOneTimeAccess,
  utmFromMetadata,
  type MinimalCheckoutSession,
} from "../_shared/one-time-purchase.ts";
import { sendPurchaseToMeta } from "../_shared/meta-capi.ts";

const SITE_URL = "https://medstation-ai.com.br";
const BILLING_RECOVERY_URL = `${SITE_URL}/settings`;
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

/** Compra confirmada para a API de Conversões da Meta (só com aceite; nunca lança). */
async function reportPurchaseToMeta(session: Stripe.Checkout.Session) {
  const result = await sendPurchaseToMeta(
    {
      sessionId: session.id,
      email: session.customer_details?.email ?? session.customer_email,
      amountCents: session.amount_total,
      currency: session.currency,
      metadata: (session.metadata ?? {}) as Record<string, string>,
    },
    { token: Deno.env.get("META_CAPI_ACCESS_TOKEN"), testEventCode: Deno.env.get("META_CAPI_TEST_EVENT_CODE") },
  );
  console.log("[stripe-webhook] meta capi", { session: session.id, ...result });
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
  if (customer.deleted) return null;
  // Vínculo explícito gravado no cliente (conta criada/ligada após o pagamento).
  const customerUserId = customer.metadata?.user_id?.trim();
  if (customerUserId) return customerUserId;
  if (!customer.email) return null;

  const existing = await findUserByEmail(
    (params) => supabase.auth.admin.listUsers(params) as any,
    customer.email,
  );
  return existing?.id ?? null;
}

/**
 * Bônus do plano anual (Arsenal Med).
 * 1) Avisa o site do Arsenal Med a cada pagamento anual confirmado (renovações
 *    estendem o prazo lá; o Arsenal Med confere a referência antes de liberar).
 * 2) Envia o e-mail do bônus uma única vez: o email_send_log é a trava de
 *    idempotência, porque renovações e reentregas não geram segundo envio.
 */
async function deliverAnnualBonus(
  supabase: ReturnType<typeof serviceClient>,
  email: string | null,
  reference: string,
) {
  if (!email) return;
  try {
    const registered = await notifyArsenalBonus(reference);
    if (!registered) {
      await supabase.rpc("create_admin_notification", {
        p_type: "sale",
        p_title: "Bônus anual não registrado no Arsenal Med",
        p_message: `Assinante anual: ${email}. O site do Arsenal Med não confirmou o registro; o acesso lá pode ser recusado.`,
        p_link: "/admin/faturamento",
        p_severity: "warning",
      });
    }

    const { data: already } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("template_name", "arsenal-med-bonus")
      .eq("recipient_email", email)
      .eq("status", "sent")
      .limit(1)
      .maybeSingle();
    if (already) return;

    await sendTemplateEmailWithLog("arsenal-med-bonus", email, {
      templateData: { email },
      idempotencyKey: `arsenal-bonus-${reference}`,
    });

    if (registered) {
      await supabase.rpc("create_admin_notification", {
        p_type: "sale",
        p_title: "Bônus anual liberado (Arsenal Med)",
        p_message: `Assinante anual: ${email}. Registrado no Arsenal Med automaticamente.`,
        p_link: "/admin/faturamento",
        p_severity: "info",
      });
    }
  } catch (error) {
    // Falha no bônus nunca pode derrubar o processamento do pagamento.
    console.error("[stripe-webhook] annual bonus delivery failed", (error as Error)?.message);
  }
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

  if (price?.recurring?.interval === "year" && (status === "active" || status === "trialing")) {
    const email = await getCustomerEmail(stripe, customerId);
    await deliverAnnualBonus(supabase, email, subscription.id);
  }

  return { userId, customerId };
}

/**
 * Garante que todo pagamento confirmado tenha uma conta dona.
 * Sem conta para o e-mail pago, convida esse e-mail (o médico recebe o link
 * para criar a senha) — antes isso só acontecia se ele voltasse à página
 * /obrigado; quem fechava a aba ficava pago e sem acesso. O vínculo é gravado
 * no Stripe (cliente e assinatura) e no espelho local, e qualquer falha avisa
 * o admin em vez de sumir em silêncio.
 */
async function ensureAccountForPayment(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  input: { email: string | null; customerId: string | null; subscriptionId?: string | null },
): Promise<string | null> {
  const { email, customerId, subscriptionId } = input;
  const lookup = (address: string) => findUserByEmail(
    (params) => supabase.auth.admin.listUsers(params) as any,
    address,
  );

  let userId: string | null = null;
  try {
    if (email) {
      userId = (await lookup(email))?.id ?? null;
      if (!userId) {
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${SITE_URL}/onboarding`,
          data: { stripe_customer_id: customerId, payment_account_setup: true },
        });
        // Convite concorrente (página /obrigado) já criou a conta: busca de novo.
        userId = data?.user?.id ?? (error ? (await lookup(email))?.id ?? null : null);
      }
    }
  } catch (error) {
    console.error("[stripe-webhook] account link failed", (error as Error)?.message);
  }

  if (!userId) {
    await supabase.rpc("create_admin_notification", {
      p_type: "sale",
      p_title: "Pagamento confirmado sem conta ligada",
      p_message: `Pagamento de ${email ?? "e-mail não informado"} sem conta na MedStation. Confira em Faturamento.`,
      p_link: "/admin/faturamento",
      p_severity: "warning",
    });
    return null;
  }

  try {
    if (customerId) await stripe.customers.update(customerId, { metadata: { user_id: userId } });
    if (subscriptionId) {
      const current = await stripe.subscriptions.retrieve(subscriptionId);
      if (!current.metadata?.user_id) {
        await stripe.subscriptions.update(subscriptionId, { metadata: { ...current.metadata, user_id: userId } });
      }
    }
  } catch (error) {
    // O espelho local abaixo já basta para liberar o acesso.
    console.error("[stripe-webhook] stripe metadata link failed", (error as Error)?.message);
  }

  if (subscriptionId) {
    await supabase.from("stripe_subscriptions")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId)
      .is("user_id", null);
  }
  return userId;
}

/** Mensais ativos do comprador (espelho local + Stripe), para trocar pelo anual sem cobrança dupla. */
async function collectMonthlySubs(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  userId: string,
  customerId: string | null,
  hinted: string | null,
): Promise<MonthlySubLite[]> {
  const byId = new Map<string, MonthlySubLite>();
  try {
    const { data } = await supabase.from("stripe_subscriptions")
      .select("stripe_subscription_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due", "unpaid", "incomplete"]);
    for (const row of data ?? []) {
      byId.set(row.stripe_subscription_id, {
        id: row.stripe_subscription_id,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
      });
    }
  } catch (error) {
    console.error("[stripe-webhook] local subs lookup failed", (error as Error)?.message);
  }
  const fresh: Stripe.Subscription[] = [];
  try {
    if (customerId) {
      const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      fresh.push(...list.data);
    }
    for (const id of [hinted, ...byId.keys()]) {
      if (!id || fresh.some((sub) => sub.id === id)) continue;
      fresh.push(await stripe.subscriptions.retrieve(id));
    }
  } catch (error) {
    console.error("[stripe-webhook] stripe subs lookup failed", (error as Error)?.message);
  }
  for (const sub of fresh) {
    byId.set(sub.id, {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: resolveSubscriptionEnd(sub as unknown as MinimalSubscription),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    });
  }
  return [...byId.values()];
}

/** Boleto gerado e ainda não pago: guarda o link e o vencimento para os lembretes. */
async function recordBoletoPending(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const intentId = objectId(session.payment_intent);
  if (!intentId) return { recorded: false, reason: "no_intent" };
  const intent = await stripe.paymentIntents.retrieve(intentId);
  const details = (intent.next_action as { boleto_display_details?: { hosted_voucher_url?: string; expires_at?: number } } | null)
    ?.boleto_display_details;
  if (!details?.hosted_voucher_url) return { recorded: false, reason: "not_boleto" };

  const plan = planFromSession(session as unknown as MinimalCheckoutSession);
  const accessPeriod = plan?.accessPeriod
    ?? (session.metadata?.access_period === "monthly_30d" ? "monthly_30d" : "annual_12m");
  const patch = {
    payment_intent_id: intentId,
    stripe_customer_id: objectId(session.customer),
    email: session.customer_details?.email ?? session.customer_email ?? null,
    checkout_status: "completed",
    payment_method: "boleto",
    boleto_voucher_url: details.hosted_voucher_url,
    boleto_expires_at: details.expires_at ? new Date(details.expires_at * 1000).toISOString() : null,
    last_event_id: eventId,
  };
  const { data: existing } = await supabase.from("stripe_one_time_purchases")
    .select("id, status").eq("checkout_session_id", session.id).maybeSingle();
  if (existing?.status === "paid") return { recorded: false, reason: "already_paid" };
  if (existing?.id) {
    await supabase.from("stripe_one_time_purchases").update(patch).eq("id", existing.id);
  } else {
    await supabase.from("stripe_one_time_purchases").insert({
      checkout_session_id: session.id,
      plan: session.metadata?.plan ?? plan?.slug ?? "pro_completo_yearly",
      amount_cents: session.amount_total ?? plan?.amountCents ?? null,
      currency: session.currency ?? null,
      status: "pending",
      payment_category: plan?.category ?? "annual_one_time",
      access_period: accessPeriod,
      recovery_status: "not_needed",
      ...utmFromMetadata(session.metadata as Record<string, string> | null),
      ...patch,
    });
  }
  return { recorded: true };
}

/**
 * Compra avulsa (Pix mensal 30 dias ou anual 12 meses, cartão ou Pix).
 * Idempotente: a unicidade de `checkout_session_id` garante que a reentrega do
 * mesmo evento nunca conceda o período duas vezes.
 */
async function grantOneTimeAccess(
  supabase: ReturnType<typeof serviceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const { data: already } = await supabase
    .from("stripe_one_time_purchases")
    .select("id, status")
    .eq("checkout_session_id", session.id)
    .maybeSingle();
  if (already?.status === "paid") return { granted: false, reason: "already_processed" };

  const plan = planFromSession(session as unknown as MinimalCheckoutSession);
  const accessPeriod = plan?.accessPeriod
    ?? (session.metadata?.access_period === "monthly_30d" ? "monthly_30d" : "annual_12m");
  const category = plan?.category
    ?? (accessPeriod === "monthly_30d" ? "pix_monthly_one_time" : "annual_one_time");

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
  if (!userId) {
    userId = await ensureAccountForPayment(supabase, stripe, { email: email ?? null, customerId });
  }

  // Extensão determinística: nova compra começa em max(agora, fim do acesso atual).
  let currentAccessEnd: string | null = null;
  if (userId) {
    const { data: latest } = await supabase
      .from("stripe_one_time_purchases")
      .select("access_end")
      .eq("user_id", userId)
      .eq("status", "paid")
      .neq("checkout_session_id", session.id)
      .order("access_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    currentAccessEnd = latest?.access_end ?? null;
  }

  // Quem já tinha o mensal: o anual começa depois do último dia pago e o mensal
  // é encerrado no fim do período, sem cobrança dupla.
  const handoff = userId && accessPeriod === "annual_12m"
    ? planMonthlyHandoff(await collectMonthlySubs(
      supabase,
      stripe,
      userId,
      customerId,
      session.metadata?.replaces_subscription?.trim() || null,
    ))
    : null;
  if (handoff?.accessFrom) currentAccessEnd = laterDate(currentAccessEnd, handoff.accessFrom);

  const paidAt = new Date();
  const { accessStart, accessEnd } = computeAccessWindow(paidAt, currentAccessEnd, accessPeriod);
  const paymentMethod = await resolvePaymentMethod(stripe, session);

  const row = {
    checkout_session_id: session.id,
    payment_intent_id: objectId(session.payment_intent),
    stripe_customer_id: customerId,
    user_id: userId,
    email: email ?? null,
    plan: session.metadata?.plan ?? plan?.slug ?? "pro_completo_yearly",
    amount_cents: session.amount_total ?? plan?.amountCents ?? null,
    currency: session.currency ?? null,
    status: "paid",
    checkout_status: "completed",
    payment_category: category,
    access_period: accessPeriod,
    payment_method: paymentMethod,
    recovery_status: "not_needed",
    paid_at: paidAt.toISOString(),
    access_start: accessStart,
    access_end: accessEnd,
    last_event_id: eventId,
    ...utmFromMetadata(session.metadata as Record<string, string> | null),
  };

  if (already?.id) {
    const { error } = await supabase.from("stripe_one_time_purchases")
      .update(row)
      .eq("id", already.id);
    if (error) throw new Error(`Failed to update one-time purchase: ${error.message}`);
  } else {
    const { error } = await supabase.from("stripe_one_time_purchases").insert(row);
    if (error) {
      // Violação de unicidade = evento concorrente/reentregue: nada a fazer.
      if (error.code === "23505") return { granted: false, reason: "duplicate" };
      throw new Error(`Failed to persist one-time purchase: ${error.message}`);
    }
  }

  if (userId) {
    await supabase.from("user_access")
      .update({ paid_access_until: accessEnd })
      .eq("user_id", userId);

    // Compra válida posterior fecha automaticamente oportunidades de recuperação.
    await supabase.from("stripe_one_time_purchases")
      .update({ recovery_status: "recovered", recovery_updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .neq("checkout_session_id", session.id)
      .in("recovery_status", ["eligible", "contacted"]);
  }

  if (handoff && (handoff.cancelAtPeriodEnd.length || handoff.cancelNow.length)) {
    const done: string[] = [];
    const failed: string[] = [];
    for (const id of handoff.cancelAtPeriodEnd) {
      try {
        await stripe.subscriptions.update(id, {
          cancel_at_period_end: true,
          metadata: { replaced_by_annual: session.id },
        });
        done.push(id);
      } catch (error) {
        console.error("[stripe-webhook] monthly handoff failed", id, (error as Error)?.message);
        failed.push(id);
      }
    }
    for (const id of handoff.cancelNow) {
      try {
        await stripe.subscriptions.cancel(id);
        done.push(id);
      } catch (error) {
        console.error("[stripe-webhook] monthly cancel failed", id, (error as Error)?.message);
        failed.push(id);
      }
    }
    if (done.length) {
      await supabase.from("stripe_one_time_purchases")
        .update({ replaced_subscription_ids: done })
        .eq("checkout_session_id", session.id);
    }
    if (failed.length) {
      await supabase.rpc("create_admin_notification", {
        p_type: "sale",
        p_title: "Mensal não encerrado após compra do anual",
        p_message: `${email ?? "Comprador"} comprou o anual, mas o mensal ${failed.join(", ")} não foi encerrado. Encerre no Stripe para evitar cobrança dupla.`,
        p_link: "/admin/black",
        p_severity: "critical",
      });
    }
  }

  // A Black MedStation (anual a R$ 399,90) não dá direito ao Arsenal Med.
  const bonusExcluded = planExcludesArsenalBonus(session.metadata?.plan ?? plan?.slug);
  if (accessPeriod === "annual_12m" && !bonusExcluded) {
    await deliverAnnualBonus(supabase, email ?? null, session.id);
  }

  return { granted: true, accessEnd, accessPeriod, paymentMethod };
}

async function resolvePaymentMethod(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<"card" | "pix" | "boleto" | "unknown"> {
  const direct = normalizePaymentMethod(session.payment_method_types);
  if (direct !== "unknown") return direct;
  const intentId = objectId(session.payment_intent);
  if (!intentId) return "unknown";
  try {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    return normalizePaymentMethod(intent.payment_method_types);
  } catch {
    return "unknown";
  }
}

async function recordOneTimeFailure(
  supabase: ReturnType<typeof serviceClient>,
  session: Stripe.Checkout.Session,
  eventId: string,
  outcome: "failed" | "expired",
) {
  const plan = planFromSession(session as unknown as MinimalCheckoutSession);
  const accessPeriod = plan?.accessPeriod
    ?? (session.metadata?.access_period === "monthly_30d" ? "monthly_30d" : "annual_12m");
  const patch = {
    payment_intent_id: objectId(session.payment_intent),
    stripe_customer_id: objectId(session.customer),
    email: session.customer_details?.email ?? session.customer_email ?? null,
    plan: session.metadata?.plan ?? plan?.slug ?? "pro_completo_yearly",
    amount_cents: session.amount_total ?? plan?.amountCents ?? null,
    currency: session.currency ?? null,
    status: outcome,
    checkout_status: outcome === "expired" ? "expired" : "completed",
    payment_category: plan?.category
      ?? (accessPeriod === "monthly_30d" ? "pix_monthly_one_time" : "annual_one_time"),
    access_period: accessPeriod,
    recovery_status: recoveryStatusForOutcome(outcome),
    last_event_id: eventId,
    ...(session.after_expiration?.recovery?.url ? { recovery_url: session.after_expiration.recovery.url } : {}),
  };

  const { data: existing } = await supabase
    .from("stripe_one_time_purchases")
    .select("id, status")
    .eq("checkout_session_id", session.id)
    .maybeSingle();

  // Pagamento já confirmado nunca é rebaixado por evento tardio.
  if (existing?.status === "paid") return;

  if (existing?.id) {
    await supabase.from("stripe_one_time_purchases").update(patch).eq("id", existing.id);
  } else {
    await supabase.from("stripe_one_time_purchases")
      .insert({ checkout_session_id: session.id, ...patch });
  }
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
          const synced = await syncSubscription(supabase, stripe, subscription, event.id);
          if (!synced.userId) {
            await ensureAccountForPayment(supabase, stripe, {
              email: session.customer_details?.email ?? session.customer_email
                ?? await getCustomerEmail(stripe, synced.customerId),
              customerId: synced.customerId,
              subscriptionId,
            });
          }
          if (session.payment_status === "paid") await reportPurchaseToMeta(session);
          break;
        }
        if (shouldGrantOneTimeAccess(event.type, session as unknown as MinimalCheckoutSession)) {
          const result = await grantOneTimeAccess(supabase, stripe, session, event.id);
          console.log("[stripe-webhook] one-time access", { type: event.type, ...result });
          await reportPurchaseToMeta(session);
        } else {
          const boleto = event.type === "checkout.session.completed" && session.mode === "payment"
            ? await recordBoletoPending(supabase, stripe, session, event.id)
            : null;
          console.log("[stripe-webhook] one-time payment not confirmed yet", {
            type: event.type,
            payment_status: session.payment_status,
            boleto,
          });
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment") {
          await recordOneTimeFailure(
            supabase,
            session,
            event.id,
            event.type === "checkout.session.expired" ? "expired" : "failed",
          );
        }
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
