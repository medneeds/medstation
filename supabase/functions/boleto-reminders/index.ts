// Lembretes de boleto em aberto (agendado a cada hora). Cada envio é sobre o
// boleto que aquela pessoa gerou: um no dia seguinte e outro no último dia.
// Idempotente por compra + etapa; nunca concede acesso (isso é do webhook).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendTemplateEmailWithLog } from "../_shared/transactional-email-templates/send-and-log.ts";
import { boletoReminderStage } from "../_shared/boleto-reminder.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function brl(cents: number | null): string | undefined {
  if (!cents) return undefined;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dueDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("stripe_one_time_purchases")
    .select("id, email, amount_cents, created_at, boleto_voucher_url, boleto_expires_at, boleto_reminders_sent")
    .eq("status", "pending")
    .eq("payment_method", "boleto")
    .not("boleto_voucher_url", "is", null)
    .gt("boleto_expires_at", nowIso)
    .limit(200);
  if (error) return json({ error: error.message }, 500);

  const results: { id: string; stage: string; outcome: string }[] = [];
  for (const row of data ?? []) {
    if (!row.email) continue;
    const sent: string[] = row.boleto_reminders_sent ?? [];
    const stage = boletoReminderStage({
      createdAt: row.created_at,
      expiresAt: row.boleto_expires_at,
      sent,
    });
    if (!stage) continue;
    try {
      const result = await sendTemplateEmailWithLog("boleto-reminder", row.email, {
        templateData: {
          stage,
          voucherUrl: row.boleto_voucher_url,
          dueDate: dueDateLabel(row.boleto_expires_at),
          amount: brl(row.amount_cents),
        },
        idempotencyKey: `boleto-reminder-${row.id}-${stage}`,
      });
      // Enviado ou bloqueado pelo destinatário: em ambos os casos não tenta de novo.
      await supabase.from("stripe_one_time_purchases")
        .update({ boleto_reminders_sent: [...sent, stage] })
        .eq("id", row.id);
      results.push({ id: row.id, stage, outcome: result.sent ? "sent" : "suppressed" });
    } catch (err) {
      console.error("[boleto-reminders] send failed", row.id, (err as Error)?.message);
      results.push({ id: row.id, stage, outcome: "failed" });
    }
  }

  return json({ checked: data?.length ?? 0, results });
});
