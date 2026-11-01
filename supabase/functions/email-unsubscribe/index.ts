// Descadastro de e-mails da MedStation pelo link do rodapé (token em email_unsubscribe_tokens).
// GET  ?token=...          -> { valid, already } (a página /descadastrar mostra o estado)
// POST { token } ou ?token -> grava em suppressed_emails (motivo "unsubscribe") e marca o token como usado.
// Público de propósito (o link vem no e-mail); só o token decide qual endereço é descadastrado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  let token = url.searchParams.get("token") ?? "";
  if (req.method === "POST" && !token) {
    try {
      const body = await req.json();
      token = typeof body?.token === "string" ? body.token : "";
    } catch {
      // corpo vazio ou form do cliente de e-mail (List-Unsubscribe-Post): fica com o token da URL
    }
  }
  if (!TOKEN_RE.test(token)) return json({ valid: false }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: row, error } = await supabase.from("email_unsubscribe_tokens")
    .select("id, email, used_at").eq("token", token).maybeSingle();
  if (error) return json({ error: "lookup_failed" }, 500);
  if (!row) return json({ valid: false }, 404);

  const email = String(row.email).trim().toLowerCase();
  const { data: suppressed } = await supabase.from("suppressed_emails").select("email").eq("email", email).maybeSingle();
  const already = Boolean(suppressed);

  if (req.method === "GET") return json({ valid: true, already });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!already) {
    const { error: upErr } = await supabase.from("suppressed_emails")
      .upsert({ email, reason: "unsubscribe", metadata: { via: "email_link" } }, { onConflict: "email" });
    if (upErr) return json({ error: "save_failed" }, 500);
    await supabase.from("email_send_log").insert({
      message_id: null,
      template_name: "system",
      recipient_email: email,
      status: "suppressed",
      error_message: "Recipient unsubscribed (link)",
    });
  }
  if (!row.used_at) {
    await supabase.from("email_unsubscribe_tokens").update({ used_at: new Date().toISOString() }).eq("id", row.id);
  }
  return json({ ok: true });
});
