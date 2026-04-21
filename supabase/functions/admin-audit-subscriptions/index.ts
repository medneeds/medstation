import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    // 1) Lista todos os customers Stripe (com email)
    const customers = await stripe.customers.list({ limit: 100 });
    const customersInfo = customers.data.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      created: c.created,
    }));

    // 2) Para cada customer, lista subscriptions ativas e seus produtos
    const subsInfo: any[] = [];
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: "all",
        limit: 10,
      });
      for (const s of subs.data) {
        const productIds: string[] = [];
        for (const item of s.items.data) {
          productIds.push(item.price.product as string);
        }
        subsInfo.push({
          customer_id: c.id,
          customer_email: c.email,
          subscription_id: s.id,
          status: s.status,
          product_ids: productIds,
          current_period_end: s.current_period_end,
          cancel_at_period_end: s.cancel_at_period_end,
        });
      }
    }

    // 3) Lista usuários auth registrados
    const { data: usersData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const users = (usersData?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
    }));

    // 4) Cruzamento: para cada subscription ativa, achar user correspondente por email
    const activeSubs = subsInfo.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );
    const crossRef = activeSubs.map((s) => {
      const user = users.find(
        (u) =>
          u.email?.toLowerCase().trim() ===
          s.customer_email?.toLowerCase().trim()
      );
      return {
        ...s,
        user_id: user?.id || null,
        user_exists: !!user,
        user_confirmed: !!user?.email_confirmed_at,
      };
    });

    return new Response(
      JSON.stringify(
        {
          customers_count: customersInfo.length,
          users_count: users.length,
          subscriptions_count: subsInfo.length,
          active_subscriptions: activeSubs.length,
          customers: customersInfo,
          all_subscriptions: subsInfo,
          active_subs_cross_ref: crossRef,
          users,
        },
        null,
        2
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
