import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// The reset link always lands on the public reset page of the production site;
// the browser never chooses where the recovery link points.
const RESET_REDIRECT = "https://medstation-ai.com.br/reset-password";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Base of the local part without digits/punctuation, e.g. "daiane_alves55" -> "daianealves". */
const emailStem = (email: string) =>
  email.split("@")[0].toLowerCase().replace(/[^a-z]/g, "");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) return json({ error: "Sessão expirada. Entre de novo." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (roleError) return json({ error: "Erro ao verificar permissões" }, 500);
    if (!isAdmin) return json({ error: "Apenas administradores podem enviar redefinição de senha." }, 403);

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.userEmail === "string" ? body.userEmail : typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }

    // Scan every page of users (listUsers returns only 50 per page by default).
    const stem = emailStem(email);
    const domain = email.split("@")[1];
    let target: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
    const similar: string[] = [];
    for (let page = 1; page <= 50 && !target; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "Erro ao buscar usuários" }, 500);
      for (const u of data.users) {
        const e = u.email?.toLowerCase();
        if (!e) continue;
        if (e === email) { target = u; break; }
        if (stem.length >= 4 && similar.length < 5 && emailStem(e) === stem && e.split("@")[1] === domain) {
          similar.push(e);
        }
      }
      if (data.users.length < 1000) break;
    }

    if (!target) {
      return json({
        error: similar.length
          ? "Não há conta com este e-mail. Encontrei e-mails parecidos:"
          : "Não há conta cadastrada com este e-mail.",
        suggestions: similar,
      }, 404);
    }

    const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo: RESET_REDIRECT });
    if (resetError) {
      const status = (resetError as { status?: number }).status;
      const msg = resetError.message || "";
      if (status === 429 || /security purposes|rate limit|after \d+ seconds/i.test(msg)) {
        return json({ error: "Um e-mail de redefinição acabou de ser enviado para esta conta. Aguarde 1 minuto e tente de novo." }, 429);
      }
      console.error("admin-reset-password: reset error", msg);
      return json({ error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." }, 500);
    }

    await admin.from("audit_log").insert({
      admin_id: caller.id,
      action: "password_reset_email",
      target_user_id: target.id,
      metadata: { email },
    });

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", target.id).maybeSingle();
    const name = (profile?.full_name as string | null) || (target.user_metadata?.full_name as string | undefined) || null;

    return json({
      success: true,
      message: `E-mail de redefinição enviado para ${email}`,
      userName: name && name.toLowerCase() !== email ? name : null,
    });
  } catch (error) {
    console.error("admin-reset-password: unexpected", error);
    return json({ error: "Erro interno. Tente de novo." }, 500);
  }
});
