import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailWithLog } from '../_shared/transactional-email-templates/send-and-log.ts'

const APP_URL = 'https://medstation-ai.com.br'

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Sends the welcome email for a freshly created account. The recipient is
// resolved server-side from the user record — never taken from the request.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }

  let userId: string | undefined
  try {
    const body = await req.json()
    userId = typeof body?.userId === 'string' ? body.userId : undefined
  } catch {
    return json({ error: 'Invalid JSON in request body' }, 400)
  }

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return json({ error: 'userId is required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  const email = userData?.user?.email
  if (userError || !email) {
    return json({ error: 'User not found' }, 404)
  }

  // Only send for accounts created moments ago — prevents replaying this
  // endpoint to re-send welcome emails to existing users.
  const createdAt = userData.user?.created_at
  if (createdAt && Date.now() - new Date(createdAt).getTime() > 30 * 60 * 1000) {
    return json({ ok: false, reason: 'not_a_new_signup' })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()

  try {
    const result = await sendTemplateEmailWithLog('welcome-lead', email, {
      idempotencyKey: `welcome-lead-${userId}`,
      templateData: {
        name: profile?.full_name ?? userData.user?.user_metadata?.full_name ?? undefined,
        appUrl: APP_URL,
        referralUrl: `${APP_URL}/indicar`,
      },
    })
    return json({ ok: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('[send-welcome-lead] falha ao enviar', error)
    return json({ error: 'Failed to send welcome email' }, 500)
  }
})
