import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[COMPLETE-CHECKOUT] ${step}${detailsStr}`);
};

const generateTempPassword = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}A1!`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId;
    if (!sessionId) throw new Error("Session ID é obrigatório");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription", "custom_fields"],
    });

    logStep("Session retrieved", {
      status: session.status,
      paymentStatus: session.payment_status,
    });

    const paymentOk =
      session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (session.status !== "complete" || !paymentOk) {
      throw new Error("Pagamento não foi concluído");
    }

    const email = (session.customer_details?.email ||
      session.customer_email ||
      (typeof session.customer === "object" && session.customer && "email" in session.customer
        ? session.customer.email
        : null))?.toLowerCase();

    if (!email) throw new Error("Email não encontrado na sessão");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Supabase Admin listUsers is paginated. The previous unpaginated call only
    // inspected the first page and could try to recreate an existing paid user.
    const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw new Error(`Não foi possível validar a conta existente: ${listError.message}`);

    const existingUser = usersPage.users.find((u) => u.email?.toLowerCase() === email);
    if (existingUser) {
      logStep("Existing account found after payment", { userExists: true });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Assinatura confirmada. Entre para continuar.",
          userExists: true,
          email,
          passwordWasSkipped: false,
          plan: session.metadata?.plan ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Backward compatibility only: old checkout sessions may contain a password
    // custom field. New guest checkouts no longer collect credentials in Stripe.
    const legacyPasswordField = session.custom_fields?.find(
      (field: any) => field.key === "password",
    );
    const legacyPassword = legacyPasswordField && "text" in legacyPasswordField
      ? legacyPasswordField.text?.value?.trim()
      : undefined;
    const passwordWasSkipped = !legacyPassword;
    const password = legacyPassword || generateTempPassword();

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        checkout_session_id: sessionId,
        stripe_customer_id: stripeCustomerId,
        password_pending_setup: passwordWasSkipped,
      },
    });

    if (createError) {
      logStep("Account provisioning failed", { code: createError.code ?? "unknown" });
      throw new Error(`Erro ao criar conta após o pagamento: ${createError.message}`);
    }

    logStep("Account created after payment", {
      userCreated: Boolean(newUser.user),
      passwordSetupRequired: passwordWasSkipped,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta criada com sucesso!",
        userExists: false,
        email,
        userId: newUser.user.id,
        passwordWasSkipped,
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
