import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailWithLog } from '../_shared/transactional-email-templates/send-and-log.ts'

const APP_URL = 'https://medstation-ai.com.br'
const EVENT_TYPE = 'welcome_trial_7d'
// Janela em que uma conta ainda é considerada "cadastro novo".
const NEW_SIGNUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
// Uma reivindicação sem envio confirmado pode ser retomada depois disso.
const STALE_CLAIM_MS = 10 * 60 * 1000

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Envia UMA única vez o e-mail de boas-vindas/teste de 7 dias para contas
// realmente novas, independentemente do provedor (Google OAuth ou magic link).
// A idempotência vive no banco (user_lifecycle_email_events), não no cliente.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const authed = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await authed.auth.getUser()
  const user = userData?.user
  if (userError || !user?.id || !user.email) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  // (b) Conta genuinamente nova: criada há pouco tempo.
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
  if (!createdAt || Date.now() - createdAt > NEW_SIGNUP_WINDOW_MS) {
    return json({ ok: false, reason: 'not_a_new_signup' })
  }

  // (c) Claim idempotente.
  const { data: existing } = await admin
    .from('user_lifecycle_email_events')
    .select('id, sent_at, claimed_at')
    .eq('user_id', user.id)
    .eq('event_type', EVENT_TYPE)
    .maybeSingle()

  if (existing) {
    if (existing.sent_at) {
      return json({ ok: true, reason: 'already_sent' })
    }
    const claimedAt = new Date(existing.claimed_at).getTime()
    if (Date.now() - claimedAt < STALE_CLAIM_MS) {
      return json({ ok: false, reason: 'in_progress' })
    }
    // Reivindicação antiga sem envio confirmado: permite retry seguro.
    await admin
      .from('user_lifecycle_email_events')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    const { error: claimError } = await admin
      .from('user_lifecycle_email_events')
      .insert({ user_id: user.id, event_type: EVENT_TYPE })
    if (claimError) {
      // 23505 = corrida entre duas abas/sessões: outra já reivindicou.
      if (claimError.code === '23505') {
        return json({ ok: true, reason: 'already_sent' })
      }
      console.error('[send-first-welcome] falha ao reivindicar evento', claimError.code)
      return json({ error: 'Failed to claim welcome email' }, 500)
    }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  try {
    const result = await sendTemplateEmailWithLog('welcome-lead', user.email, {
      idempotencyKey: `welcome-trial-7d-${user.id}`,
      templateData: {
        name: profile?.full_name ?? user.user_metadata?.full_name ?? undefined,
        appUrl: APP_URL,
        referralUrl: `${APP_URL}/indicar`,
      },
    })

    // (f) Só marca sent_at quando o provedor aceitou (ou suprimiu definitivamente).
    await admin
      .from('user_lifecycle_email_events')
      .update({
        sent_at: new Date().toISOString(),
        attempts: 1,
        last_error: result.sent ? null : (result.reason ?? 'not_sent'),
      })
      .eq('user_id', user.id)
      .eq('event_type', EVENT_TYPE)

    return json({ ok: result.sent, reason: result.sent ? 'sent' : result.reason })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[send-first-welcome] falha ao enviar')
    // Mantém sent_at nulo e libera retry na próxima janela.
    await admin
      .from('user_lifecycle_email_events')
      .update({
        last_error: message.slice(0, 500),
        claimed_at: new Date(Date.now() - STALE_CLAIM_MS).toISOString(),
      })
      .eq('user_id', user.id)
      .eq('event_type', EVENT_TYPE)
    return json({ error: 'Failed to send welcome email' }, 500)
  }
})
