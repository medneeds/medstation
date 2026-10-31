// Painel da Black (admin): visitas, lista VIP, cliques em assinar, pagamentos,
// boletos em aberto, quem começou e não pagou, e de onde veio cada venda.
// Agregação por service role; o navegador só lê o resultado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { BLACK_OFFER } from "../_shared/pricing-schedule.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Lead = {
  email: string;
  phone: string;
  source: string;
  utm: Record<string, string> | null;
  referrer: string | null;
  created_at: string;
};

type Purchase = {
  id: string;
  email: string | null;
  user_id: string | null;
  status: string;
  checkout_status: string;
  payment_method: string;
  amount_cents: number | null;
  created_at: string;
  paid_at: string | null;
  recovery_status: string;
  recovery_url: string | null;
  boleto_voucher_url: string | null;
  boleto_expires_at: string | null;
  boleto_reminders_sent: string[] | null;
  replaced_subscription_ids: string[] | null;
};

const isTestEmail = (email: string | null | undefined) =>
  !email || /@(example\.(com|org|net)|teste?\.com)$/i.test(email);

/** Dia no horário de Brasília (AAAA-MM-DD). */
const brDay = (iso: string) => new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);

function sourceOf(lead: Lead | undefined): string {
  const utm = lead?.utm ?? {};
  if (utm.utm_source) return utm.utm_source.toLowerCase();
  const ref = lead?.referrer ?? "";
  if (/instagram/i.test(ref)) return "instagram";
  if (/facebook|fb\./i.test(ref)) return "facebook";
  if (/google/i.test(ref)) return "google";
  if (/whatsapp|wa\.me/i.test(ref)) return "whatsapp";
  return lead ? "direto" : "sem registro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "No authorization header" }, 401);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Authentication failed" }, 401);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  // A lista VIP começou antes da abertura: olha desde 7 dias antes.
  const since = new Date(Date.parse(BLACK_OFFER.startsAt) - 7 * 86_400_000).toISOString();

  const [views, leadsRes, purchasesRes] = await Promise.all([
    supabase.from("page_views").select("created_at, session_id").eq("path", "/black").gte("created_at", since).limit(20000),
    supabase.from("leads").select("email, phone, source, utm, referrer, created_at")
      .in("source", ["black_vip", "black_checkout"]).gte("created_at", since)
      .order("created_at", { ascending: true }).limit(5000),
    supabase.from("stripe_one_time_purchases")
      .select("id, email, user_id, status, checkout_status, payment_method, amount_cents, created_at, paid_at, recovery_status, recovery_url, boleto_voucher_url, boleto_expires_at, boleto_reminders_sent, replaced_subscription_ids")
      .eq("plan", BLACK_OFFER.slug).order("created_at", { ascending: false }).limit(5000),
  ]);
  if (views.error || leadsRes.error || purchasesRes.error) {
    return json({ error: views.error?.message ?? leadsRes.error?.message ?? purchasesRes.error?.message }, 500);
  }

  const leads = ((leadsRes.data ?? []) as Lead[])
    .map((l) => ({ ...l, email: l.email.trim().toLowerCase() }))
    .filter((l) => !isTestEmail(l.email));
  const purchases = ((purchasesRes.data ?? []) as Purchase[])
    .map((p) => ({ ...p, email: p.email?.trim().toLowerCase() ?? null }))
    .filter((p) => !isTestEmail(p.email));

  // Telefone: o que a pessoa deixou em qualquer contato, ou o do perfil.
  const phoneByEmail = new Map<string, string>();
  for (const l of leads) if (l.phone?.trim()) phoneByEmail.set(l.email, l.phone.trim());
  const userIds = [...new Set(purchases.map((p) => p.user_id).filter(Boolean))] as string[];
  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, phone, full_name").in("id", userIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    for (const p of purchases) {
      const profile = p.user_id ? byId.get(p.user_id) : null;
      if (p.email && profile?.phone && !phoneByEmail.has(p.email)) phoneByEmail.set(p.email, profile.phone);
    }
  }

  const firstLeadByEmail = new Map<string, Lead>();
  for (const l of leads) if (!firstLeadByEmail.has(l.email)) firstLeadByEmail.set(l.email, l);

  const paid = purchases.filter((p) => p.status === "paid");
  const paidEmails = new Set(paid.map((p) => p.email).filter(Boolean) as string[]);
  const vipLeads = leads.filter((l) => l.source === "black_vip");
  const vipByEmail = new Map<string, Lead>();
  for (const l of vipLeads) vipByEmail.set(l.email, l);
  const clickEmails = new Set(leads.filter((l) => l.source === "black_checkout").map((l) => l.email));

  const pendingBoletos = purchases.filter((p) =>
    p.status === "pending" && p.payment_method === "boleto" && p.boleto_expires_at &&
    Date.parse(p.boleto_expires_at) > Date.now()
  );
  const boletoEmails = new Set(pendingBoletos.map((p) => p.email));

  // Começou e não pagou: clicou em assinar ou abriu o pagamento, sem compra paga
  // e sem boleto ainda dentro do prazo.
  const latestAttempt = new Map<string, Purchase>();
  for (const p of purchases) {
    if (!p.email || p.status === "paid") continue;
    if (!latestAttempt.has(p.email)) latestAttempt.set(p.email, p);
  }
  const abandonedEmails = new Set<string>([...clickEmails, ...latestAttempt.keys()]);
  const abandoned = [...abandonedEmails]
    .filter((email) => !paidEmails.has(email) && !boletoEmails.has(email))
    .map((email) => {
      const attempt = latestAttempt.get(email);
      const lead = firstLeadByEmail.get(email);
      return {
        email,
        phone: phoneByEmail.get(email) ?? null,
        last_at: attempt?.created_at ?? lead?.created_at ?? null,
        purchase_id: attempt?.id ?? null,
        stage: attempt ? attempt.status === "expired" ? "expirou" : attempt.status === "failed" ? "falhou" : "abriu o pagamento" : "clicou em assinar",
        recovery_url: attempt?.recovery_url ?? null,
        recovery_status: attempt?.recovery_status ?? null,
      };
    })
    .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));

  // Por origem: cliques em assinar, vendas e receita.
  const bySource = new Map<string, { source: string; clicks: number; paid: number; revenue_cents: number }>();
  const bucket = (source: string) => {
    if (!bySource.has(source)) bySource.set(source, { source, clicks: 0, paid: 0, revenue_cents: 0 });
    return bySource.get(source)!;
  };
  for (const email of clickEmails) bucket(sourceOf(firstLeadByEmail.get(email))).clicks++;
  for (const p of paid) {
    const b = bucket(sourceOf(p.email ? firstLeadByEmail.get(p.email) : undefined));
    b.paid++;
    b.revenue_cents += p.amount_cents ?? 0;
  }

  // Por dia (Brasília).
  const daily = new Map<string, { day: string; visits: number; clicks: number; paid: number }>();
  const day = (iso: string) => {
    const d = brDay(iso);
    if (!daily.has(d)) daily.set(d, { day: d, visits: 0, clicks: 0, paid: 0 });
    return daily.get(d)!;
  };
  for (const v of views.data ?? []) day(v.created_at).visits++;
  for (const l of leads) if (l.source === "black_checkout") day(l.created_at).clicks++;
  for (const p of paid) day(p.paid_at ?? p.created_at).paid++;

  const sessions = new Set((views.data ?? []).map((v) => v.session_id).filter(Boolean));

  return json({
    offer: { startsAt: BLACK_OFFER.startsAt, endsAt: BLACK_OFFER.endsAt },
    kpis: {
      visits: views.data?.length ?? 0,
      visitors: sessions.size,
      vip: vipByEmail.size,
      clicks: clickEmails.size,
      checkouts: new Set(purchases.map((p) => p.email)).size,
      paid: paid.length,
      revenue_cents: paid.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0),
      pending_boletos: pendingBoletos.length,
      switched_from_monthly: paid.filter((p) => (p.replaced_subscription_ids ?? []).length > 0).length,
    },
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    by_source: [...bySource.values()].sort((a, b) => b.paid - a.paid || b.clicks - a.clicks),
    vip: [...vipByEmail.values()].reverse().map((l) => ({
      email: l.email,
      phone: phoneByEmail.get(l.email) ?? (l.phone || null),
      created_at: l.created_at,
      paid: paidEmails.has(l.email),
    })),
    abandoned,
    boletos: pendingBoletos.map((p) => ({
      id: p.id,
      email: p.email,
      phone: p.email ? phoneByEmail.get(p.email) ?? null : null,
      amount_cents: p.amount_cents,
      created_at: p.created_at,
      expires_at: p.boleto_expires_at,
      voucher_url: p.boleto_voucher_url,
      reminders_sent: p.boleto_reminders_sent ?? [],
    })),
    sales: paid.map((p) => ({
      email: p.email,
      phone: p.email ? phoneByEmail.get(p.email) ?? null : null,
      amount_cents: p.amount_cents,
      method: p.payment_method,
      paid_at: p.paid_at,
      source: sourceOf(p.email ? firstLeadByEmail.get(p.email) : undefined),
      switched_from_monthly: (p.replaced_subscription_ids ?? []).length > 0,
    })),
  });
});
