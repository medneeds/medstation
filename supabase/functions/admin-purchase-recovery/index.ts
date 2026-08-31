// Visão admin-only de compras avulsas (Pix mensal e anual à vista) e da fila
// de recuperação comercial. Agregação por service role — o frontend não faz
// queries complexas. GET = agregados + fila; POST = atualizar status manual.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

type PurchaseRow = {
  id: string;
  checkout_session_id: string;
  user_id: string | null;
  email: string | null;
  plan: string;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  checkout_status: string;
  payment_category: string;
  access_period: string | null;
  payment_method: string;
  recovery_status: string;
  acquisition_source: string | null;
  campaign: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  paid_at: string | null;
  access_start: string | null;
  access_end: string | null;
};

const VALID_RECOVERY = ["not_needed", "eligible", "contacted", "recovered", "dismissed"];

/** Fonte indisponível vira null (Indisponível), nunca zero falso. */
function rate(paid: number, initiated: number): number | null {
  if (!initiated) return null;
  return Math.round((paid / initiated) * 1000) / 10;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) return json({ error: "Authentication failed" }, 401);

    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userData.user.id });
    if (!isStaff) return json({ error: "Forbidden: staff access required" }, 403);

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const id = typeof body.id === "string" ? body.id : null;
      const status = typeof body.recovery_status === "string" ? body.recovery_status : null;
      if (!id || !status || !VALID_RECOVERY.includes(status)) {
        return json({ error: "invalid_payload" }, 400);
      }
      const { error } = await supabase.from("stripe_one_time_purchases")
        .update({
          recovery_status: status,
          recovery_updated_at: new Date().toISOString(),
          recovery_updated_by: userData.user.id,
        })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id, recovery_status: status });
    }

    const url = new URL(req.url);
    const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from("stripe_one_time_purchases")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return json({ error: error.message, source: "unavailable" }, 500);

    const rows = (data ?? []) as PurchaseRow[];
    const pix = rows.filter((r) => r.payment_category === "pix_monthly_one_time");
    const annual = rows.filter((r) => r.payment_category === "annual_one_time");
    const count = (list: PurchaseRow[], pred: (r: PurchaseRow) => boolean) =>
      list.filter(pred).length;
    const revenue = (list: PurchaseRow[]) =>
      list.filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);

    // Assinatura recorrente ativa — fonte separada, nunca misturada com one-time.
    const { count: activeSubs, error: subsError } = await supabase
      .from("stripe_subscriptions")
      .select("stripe_subscription_id", { count: "exact", head: true })
      .eq("status", "active");

    const nowIso = new Date().toISOString();

    // Pix mensal pago cujos 30 dias venceram e sem compra vigente posterior.
    const paidPix = pix.filter((r) => r.status === "paid");
    const stillValidUsers = new Set(
      rows.filter((r) => r.status === "paid" && r.access_end && r.access_end > nowIso)
        .map((r) => r.user_id ?? r.email ?? r.id),
    );
    const expiredAccess = paidPix.filter((r) =>
      r.access_end && r.access_end <= nowIso &&
      !stillValidUsers.has(r.user_id ?? r.email ?? r.id)
    );

    const cards = {
      window_days: days,
      subscriptions_active: subsError ? null : (activeSubs ?? 0),
      pix_monthly: {
        initiated: pix.length,
        paid: count(pix, (r) => r.status === "paid"),
        pending: count(pix, (r) => r.status === "pending"),
        failed_or_expired: count(pix, (r) => r.status === "failed" || r.status === "expired"),
        access_expired_without_repurchase: expiredAccess.length,
        conversion_pct: rate(count(pix, (r) => r.status === "paid"), pix.length),
        revenue_cents: revenue(pix),
      },
      annual_one_time: {
        initiated: annual.length,
        paid: count(annual, (r) => r.status === "paid"),
        pending: count(annual, (r) => r.status === "pending"),
        failed_or_expired: count(annual, (r) => r.status === "failed" || r.status === "expired"),
        conversion_pct: rate(count(annual, (r) => r.status === "paid"), annual.length),
        revenue_cents: revenue(annual),
      },
      note: "Receita avulsa nunca entra no MRR. MRR = assinaturas recorrentes ativas.",
    };

    const opportunities = [
      ...rows.filter((r) => r.status === "pending" && r.recovery_status !== "recovered")
        .map((r) => ({ ...r, opportunity: "checkout_abandonado" })),
      ...rows.filter((r) => r.status === "failed")
        .map((r) => ({ ...r, opportunity: "pagamento_falhou" })),
      ...rows.filter((r) => r.status === "expired")
        .map((r) => ({ ...r, opportunity: "checkout_abandonado" })),
      ...expiredAccess.map((r) => ({ ...r, opportunity: "pix_mensal_expirado" })),
    ];

    const { data: pastDue } = await supabase
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, user_id, status, past_due_since, last_payment_failed_at")
      .in("status", ["past_due", "unpaid"])
      .limit(200);

    return json({
      generated_at: nowIso,
      cards,
      opportunities,
      subscription_payment_failed: pastDue ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-PURCHASE-RECOVERY]", message);
    return json({ error: message }, 500);
  }
});
