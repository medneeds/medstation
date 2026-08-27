import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail, maskEmail } from "../_shared/admin-users.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[COMPLETE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId) throw new Error("Session ID é obrigatório");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    const paymentOk =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (session.status !== "complete" || !paymentOk) {
      throw new Error("Pagamento não foi concluído");
    }

    const email = session.customer_email || (session.customer as { email?: string } | null)?.email;
    if (!email) throw new Error("Email não encontrado na sessão");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const existing = await findUserByEmail(
      (params) => supabaseAdmin.auth.admin.listUsers(params) as any,
      email,
    );

    if (existing) {
      logStep("Existing account matched to paid checkout", {
        userId: existing.id,
        email: maskEmail(email),
      });
      return new Response(
        JSON.stringify({
          success: true,
          userExists: true,
          email,
          passwordWasSkipped: false,
          accountSetup: "existing_user",
          plan: session.metadata?.plan ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // SECURITY: a successful Stripe payment proves payment, not ownership of the
    // email typed in Checkout. Never auto-confirm that email and never return a
    // magic/recovery action link to the browser. Initial access is delivered to
    // the mailbox owner through a Supabase invitation.
    const origin = req.headers.get("origin") || "https://medstation-ai.com.br";
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/onboarding`,
      data: {
        checkout_session_id: sessionId,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
        payment_account_setup: true,
      },
    });

    if (inviteError) {
      logStep("Could not deliver account invite", {
        email: maskEmail(email),
        error: inviteError.message,
      });
      return new Response(
        JSON.stringify({
          success: true,
          userExists: false,
          email,
          passwordWasSkipped: true,
          accountSetup: "invite_failed",
          message: "Pagamento confirmado, mas não foi possível enviar o convite de acesso agora.",
          plan: session.metadata?.plan ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    logStep("Secure account invitation sent", {
      userId: invited.user?.id ?? null,
      email: maskEmail(email),
    });

    return new Response(
      JSON.stringify({
        success: true,
        userExists: false,
        email,
        passwordWasSkipped: true,
        accountSetup: "invite_sent",
        message: "Pagamento confirmado. Enviamos um convite para você concluir o acesso pelo seu e-mail.",
        plan: session.metadata?.plan ?? null,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
