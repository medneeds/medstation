import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  isBonusReference,
  purchaseEligibility,
  subscriptionEligibility,
  type BonusEligibility,
} from "../_shared/arsenal-bonus.ts";

/**
 * Chamada pelo site do Arsenal Med para confirmar que uma referência de
 * pagamento corresponde a um plano anual vigente da MedStation. Não exige
 * login: a própria referência (id de checkout ou de assinatura) é o comprovante.
 * Referências desconhecidas recebem só { eligible: false }.
 */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let reference: unknown;
  try {
    reference = (await req.json())?.reference;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!isBonusReference(reference)) return json({ error: "Invalid reference" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    let result: BonusEligibility = { eligible: false };

    if (reference.startsWith("cs_")) {
      const { data } = await supabase
        .from("stripe_one_time_purchases")
        .select("email, status, access_period, access_end")
        .eq("checkout_session_id", reference)
        .maybeSingle();
      result = purchaseEligibility(data);
    } else {
      const { data } = await supabase
        .from("stripe_subscriptions")
        .select("user_id, status, billing_interval, current_period_end")
        .eq("stripe_subscription_id", reference)
        .maybeSingle();
      let accountEmail: string | null = null;
      if (data?.user_id) {
        const { data: user } = await supabase.auth.admin.getUserById(data.user_id);
        accountEmail = user?.user?.email ?? null;
      }
      result = subscriptionEligibility(data, accountEmail);
    }

    console.log("[arsenal-bonus-verify]", { kind: reference.slice(0, 3), eligible: result.eligible });
    return json(result);
  } catch (error) {
    console.error("[arsenal-bonus-verify] failed", (error as Error)?.message);
    return json({ error: "Verification unavailable" }, 500);
  }
});
