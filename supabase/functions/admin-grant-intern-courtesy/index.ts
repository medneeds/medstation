import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailWithLog } from '../_shared/transactional-email-templates/send-and-log.ts'
import { planInternCourtesy } from './plan.ts'

// Grants the intern campaign courtesy for one signup and sends the welcome
// email to that intern. Admin only; recipient and dates are resolved server-side.

const CAMPAIGN_ID = 'internos-30'
const COURTESY_DAYS = 30
const APP_URL = 'https://medstation-ai.com.br/auth'
const WHATSAPP_URL = 'https://chat.whatsapp.com/LQu9cCmdCagI0swlYUjInY'

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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
  if (authErr || !authData.user) return json({ error: 'Sessão inválida. Entre de novo no painel.' }, 401)
  const adminId = authData.user.id
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: adminId, _role: 'admin' })
  if (!isAdmin) return json({ error: 'Apenas administradores podem liberar cortesias' }, 403)

  let signupId: string | undefined
  try {
    const body = await req.json()
    signupId = typeof body?.signupId === 'string' ? body.signupId : undefined
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400)
  }
  if (!signupId || !/^[0-9a-f-]{36}$/i.test(signupId)) return json({ error: 'signupId inválido' }, 400)

  const { data: signup, error: sErr } = await admin
    .from('intern_campaign_signups')
    .select('id, campaign, full_name, email, converted_user_id, courtesy_granted_at')
    .eq('id', signupId)
    .maybeSingle()
  if (sErr) return json({ error: sErr.message }, 500)
  if (!signup || signup.campaign !== CAMPAIGN_ID) return json({ error: 'Inscrição não encontrada' }, 404)
  if (!signup.converted_user_id) return json({ error: 'O interno ainda não criou a conta na MedStation' }, 409)
  if (signup.courtesy_granted_at) return json({ ok: true, alreadyGranted: true })

  // Posição oficial na fila (ordem de inscrição).
  const { data: ordered, error: oErr } = await admin
    .from('intern_campaign_signups')
    .select('id')
    .eq('campaign', CAMPAIGN_ID)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (oErr) return json({ error: oErr.message }, 500)
  const position = (ordered ?? []).findIndex((r) => r.id === signup.id) + 1

  const userId = signup.converted_user_id as string
  const { data: existing, error: cErr } = await admin
    .from('courtesy_access')
    .select('id, expires_at, source')
    .eq('user_id', userId)
    .maybeSingle()
  if (cErr) return json({ error: cErr.message }, 500)

  const plan = planInternCourtesy(existing, COURTESY_DAYS)
  const reason = `Campanha internos · posição ${position}`
  if (plan.action === 'insert') {
    const { error } = await admin.from('courtesy_access').insert({
      user_id: userId, granted_by: adminId, expires_at: plan.expiresAt, reason, source: 'intern_campaign',
    })
    if (error) return json({ error: error.message }, 500)
  } else if (plan.action === 'update' && existing) {
    const { error } = await admin.from('courtesy_access').update({
      granted_by: adminId, expires_at: plan.expiresAt, reason, source: 'intern_campaign',
    }).eq('id', existing.id)
    if (error) return json({ error: error.message }, 500)
  }

  const { error: mErr } = await admin
    .from('intern_campaign_signups')
    .update({ courtesy_granted_at: new Date().toISOString() })
    .eq('id', signup.id)
  if (mErr) return json({ error: mErr.message }, 500)

  await admin.from('audit_log').insert({
    admin_id: adminId,
    action: 'grant_intern_courtesy',
    target_user_id: userId,
    metadata: { signup_id: signup.id, position, plan: plan.action, expires_at: plan.expiresAt },
  })

  // E-mail de boas-vindas: falha no envio não desfaz a liberação.
  let email: 'sent' | 'suppressed' | 'failed' = 'failed'
  const { data: userData } = await admin.auth.admin.getUserById(userId)
  const recipient = userData?.user?.email ?? signup.email
  try {
    const firstName = String(signup.full_name ?? '').trim().split(/\s+/)[0] ?? ''
    const name = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : ''
    const result = await sendTemplateEmailWithLog('intern-courtesy-welcome', recipient, {
      templateData: {
        name,
        days: COURTESY_DAYS,
        expiresAt: plan.expiresAt,
        appUrl: APP_URL,
        whatsappUrl: WHATSAPP_URL,
      },
      idempotencyKey: `intern-courtesy-welcome-${signup.id}`,
    })
    email = result.sent ? 'sent' : 'suppressed'
  } catch (e) {
    console.error('intern courtesy welcome email failed', e instanceof Error ? e.message : e)
  }

  return json({ ok: true, plan: plan.action, expiresAt: plan.expiresAt, position, email })
})
