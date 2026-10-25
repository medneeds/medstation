import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailWithLog } from '../_shared/transactional-email-templates/send-and-log.ts'
import { notifyArsenalBonus, purchaseEligibility, subscriptionEligibility } from '../_shared/arsenal-bonus.ts'

// Admin only. Re-sends the Arsenal Med annual bonus for every current annual
// subscriber: pushes each payment reference to the Arsenal Med site again and
// re-sends the bonus email (one resend per reference per day).

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type Target = { reference: string; email: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Configuração do servidor ausente' }, 500)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Sessão ausente' }, 401)
  const { data: authData, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !authData.user) return json({ error: 'Sessão inválida' }, 401)
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: authData.user.id, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Apenas administradores' }, 403)

  let sendEmail = true
  let notify = true
  try {
    const body = await req.json()
    if (body?.sendEmail === false) sendEmail = false
    if (body?.notify === false) notify = false
  } catch {
    // corpo vazio: usa os padrões
  }

  const targets: Target[] = []

  const { data: purchases, error: pErr } = await admin
    .from('stripe_one_time_purchases')
    .select('checkout_session_id, email, status, access_period, access_end')
    .eq('access_period', 'annual_12m')
    .eq('status', 'paid')
  if (pErr) return json({ error: pErr.message }, 500)
  for (const row of purchases ?? []) {
    const result = purchaseEligibility(row)
    if (result.eligible && row.checkout_session_id) {
      targets.push({ reference: row.checkout_session_id, email: result.email })
    }
  }

  const { data: subs, error: sErr } = await admin
    .from('stripe_subscriptions')
    .select('stripe_subscription_id, user_id, status, billing_interval, current_period_end')
    .eq('billing_interval', 'year')
  if (sErr) return json({ error: sErr.message }, 500)
  for (const row of subs ?? []) {
    if (!row.user_id) continue
    const { data: user } = await admin.auth.admin.getUserById(row.user_id)
    const result = subscriptionEligibility(row, user?.user?.email ?? null)
    if (result.eligible) targets.push({ reference: row.stripe_subscription_id, email: result.email })
  }

  const day = new Date().toISOString().slice(0, 10)
  const results = []
  for (const t of targets) {
    const registered = notify ? await notifyArsenalBonus(t.reference) : null
    let emailed: boolean | string = false
    if (sendEmail) {
      try {
        const r = await sendTemplateEmailWithLog('arsenal-med-bonus', t.email, {
          templateData: { email: t.email },
          idempotencyKey: `arsenal-bonus-resend-${t.reference}-${day}`,
        })
        emailed = r.sent ? true : 'suppressed'
      } catch (error) {
        emailed = `failed: ${(error as Error)?.message ?? 'erro'}`.slice(0, 200)
      }
    }
    results.push({ email: t.email, registered, emailed })
  }

  console.log('[admin-resend-arsenal-bonus]', { total: targets.length })
  return json({ ok: true, total: targets.length, results })
})
