import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
      customerEmail: session.customer_email,
      paymentStatus: session.payment_status,
    });
    
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      throw new Error("Pagamento não foi concluído");
    }
    
    const email = session.customer_email || (session.customer as any)?.email;
    if (!email) {
      throw new Error("Email não encontrado na sessão");
    }
    
    // Get password from custom fields
    const passwordField = session.custom_fields?.find((f: { key: string; text?: { value: string } }) => f.key === 'password');
    const password = passwordField?.text?.value;
    
    if (!password) {
      throw new Error("Senha não fornecida");
    }
    
    logStep("Creating user account", { email });
    
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      logStep("User already exists, returning success");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Usuário já existe. Faça login com sua senha.",
        userExists: true,
        email,
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
      },
    });
    
    if (createError) {
      logStep("Error creating user", { error: createError.message });
      throw new Error(`Erro ao criar conta: ${createError.message}`);
    }
    
    logStep("User created successfully", { userId: newUser.user.id });
    
    // Generate a session token for auto-login
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${req.headers.get("origin")}/onboarding`,
      }
    });
    
    if (sessionError) {
      logStep("Could not generate auto-login link", { error: sessionError.message });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Conta criada com sucesso!",
      userExists: false,
      email,
      userId: newUser.user.id,
      // Return magic link token for auto-login if available
      autoLoginUrl: sessionData?.properties?.hashed_token ? 
        `${req.headers.get("origin")}/auth/callback?token=${sessionData.properties.hashed_token}` : 
        null,
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
