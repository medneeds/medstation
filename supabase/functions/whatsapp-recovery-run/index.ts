// Rodada automática da recuperação por WhatsApp (pg_cron, de hora em hora, minuto 23).
// Sai sem fazer nada com a flag whatsapp_recovery_auto desligada. Quem recebe o quê:
// regra pura em _shared/whatsapp-recovery.ts; envio e reservas em _shared/whatsapp-recovery-engine.ts.
// Chamar de novo não duplica nada: cada etapa é única por contato e cada pessoa entra uma vez.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { loadState, runRecovery } from "../_shared/whatsapp-recovery-engine.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
  try {
    const state = await loadState(supabase);
    if (!state.autoEnabled) return json({ skipped: "auto_disabled" });
    const summary = await runRecovery(supabase, { trigger: "auto" });
    return json(summary);
  } catch (err) {
    console.error("[whatsapp-recovery-run]", (err as Error)?.message);
    return json({ error: "run_failed" }, 500);
  }
});
