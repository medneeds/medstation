import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail, generateTempPassword, maskEmail } from "../_shared/admin-users.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json().catch(() => ({}));
    const sessionId = body.sessionId;
    
    if (!sessionId) {
      throw new Error("Session ID é obrigatório");
    }
    
    logStep("Processing session", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Get checkout session details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'custom_fields'],
    });
    
    logStep("Session retrieved", { 
      status: session.status,
      paymentStatus: session.payment_status,
    });
    
    const paymentOk =
      session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (session.status !== 'complete' || !paymentOk) {
      throw new Error("Pagamento não foi concluído");
    }
    
    const email = session.customer_email || (session.customer as any)?.email;
    if (!email) {
      throw new Error("Email não encontrado na sessão");
    }
    
    // Compatibilidade: sessões ANTIGAS podem trazer senha em custom_fields.
    // Novos fluxos NÃO coletam senha no Stripe — a conta é criada com senha
    // temporária forte e o usuário define a senha pelo fluxo do Supabase.
    const passwordField = session.custom_fields?.find((f: { key: string; text?: { value: string } }) => f.key === 'password');
    const legacyPassword = passwordField?.text?.value?.trim();
    const passwordWasSkipped = !legacyPassword;
    const password = legacyPassword || generateTempPassword();

    logStep("Creating user account", { email: maskEmail(email), passwordWasSkipped });

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // listUsers() sem paginação só devolve os 50 primeiros usuários — isso
    // fazia contas existentes serem tratadas como inexistentes.
    const existing = await findUserByEmail(
      (params) => supabaseAdmin.auth.admin.listUsers(params) as any,
      email,
    );

    if (existing) {
      logStep("User already exists, returning success");
      return new Response(JSON.stringify({
        success: true,
        message: "Usuário já existe. Faça login com sua senha.",
        userExists: true,
        email,
        passwordWasSkipped,
        plan: session.metadata?.plan ?? null,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        checkout_session_id: sessionId,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        password_pending_setup: passwordWasSkipped,
      },
    });

    if (createError) {
      logStep("Error creating user", { error: createError.message });
      throw new Error(`Erro ao criar conta: ${createError.message}`);
    }

    logStep("User created successfully", { userId: newUser.user.id, passwordWasSkipped });

    // Link de acesso gerado pelo próprio Supabase (action_link). Nunca montamos
    // URL manual com hashed_token.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: passwordWasSkipped ? 'recovery' : 'magiclink',
      email,
      options: {
        redirectTo: `${req.headers.get("origin")}/onboarding`,
      }
    });

    if (linkError) {
      logStep("Could not generate access link", { error: linkError.message });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Conta criada com sucesso!",
      userExists: false,
      email,
      userId: newUser.user.id,
      passwordWasSkipped,
      plan: session.metadata?.plan ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      // action_link oficial do Supabase (define senha / entra na conta).
      autoLoginUrl: linkData?.properties?.action_link ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
