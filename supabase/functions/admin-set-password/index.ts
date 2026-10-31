import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { findUserByEmail } from "../_shared/admin-users.ts";
import { adminPasswordProblem } from "../_shared/admin-password.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Admin-only: sets a new password for an existing account and marks its e-mail
 * as confirmed. Used when confirmation/reset e-mails do not reach the user.
 * The password is never logged or stored outside the auth system.
 */
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
    if (!isAdmin) return json({ error: "Apenas administradores podem alterar senhas." }, 403);

    const body = await req.json().catch(() => ({}));
    const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();
    const password = body?.password;
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }
    const problem = adminPasswordProblem(password, email);
    if (problem) return json({ error: problem }, 400);

    let target;
    try {
      target = await findUserByEmail(
        (params) => admin.auth.admin.listUsers(params) as any,
        email,
      );
    } catch {
      return json({ error: "Erro ao buscar usuários" }, 500);
    }
    if (!target) return json({ error: "Não há conta cadastrada com este e-mail." }, 404);

    const { data: before } = await admin.auth.admin.getUserById(target.id);
    const wasConfirmed = Boolean(before?.user?.email_confirmed_at);

    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
      password: password as string,
      email_confirm: true,
    });
    if (updateError) {
      const msg = updateError.message || "";
      console.error("admin-set-password: update error", msg.slice(0, 200));
      if (/weak|pwned|leaked|known/i.test(msg)) {
        return json({ error: "Essa senha é conhecida em vazamentos. Escolha outra." }, 400);
      }
      return json({ error: "Não foi possível alterar a senha agora. Tente de novo." }, 500);
    }

    await admin.from("audit_log").insert({
      admin_id: caller.id,
      action: "password_set_by_admin",
      target_user_id: target.id,
      metadata: { email, email_confirmed_now: !wasConfirmed },
    });

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", target.id).maybeSingle();
    const name = (profile?.full_name as string | null) || null;

    return json({
      success: true,
      message: wasConfirmed
        ? `Senha alterada para ${email}.`
        : `Senha alterada e e-mail confirmado para ${email}.`,
      userName: name && name.toLowerCase() !== email ? name : null,
      emailConfirmedNow: !wasConfirmed,
    });
  } catch (error) {
    console.error("admin-set-password: unexpected", error);
    return json({ error: "Erro interno. Tente de novo." }, 500);
  }
});
