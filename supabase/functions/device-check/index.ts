import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmailWithLog } from '../_shared/transactional-email-templates/send-and-log.ts'
import {
  authenticate,
  cleanLabel,
  CODE_TTL_MS,
  isValidDeviceId,
  json,
  markActive,
  RESEND_COOLDOWN_MS,
  sha256,
} from '../_shared/device-guard.ts'

function maskEmail(email: string) {
  const [u, d] = email.split('@')
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${d}`
}

// Decide se este aparelho pode entrar direto ou precisa de código por e-mail.
// Body: { device_id, label?, fresh?: boolean, shared?: boolean, resend?: boolean }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await authenticate(req)
  if (auth instanceof Response) return auth
  const { user, admin } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  if (!isValidDeviceId(body.device_id)) return json({ error: 'invalid device' }, 400)
  const deviceHash = await sha256(`${user.id}:${body.device_id}`)
  const label = cleanLabel(body.label)
  const fresh = body.fresh === true
  const shared = body.shared === true
  const resend = body.resend === true

  try {
    const nowIso = new Date().toISOString()
    const [{ data: active }, { data: trusted }] = await Promise.all([
      admin.from('active_sessions').select('device_hash').eq('user_id', user.id).maybeSingle(),
      shared
        ? Promise.resolve({ data: null })
        : admin
            .from('trusted_devices')
            .select('id')
            .eq('user_id', user.id)
            .eq('device_hash', deviceHash)
            .gt('expires_at', nowIso)
            .maybeSingle(),
    ])

    // Já é o acesso ativo (ex.: recarregou a página) e não é um login novo.
    if (!resend && !fresh && active?.device_hash === deviceHash) {
      return json({ status: 'ok' })
    }

    // Aparelho reconhecido: entra direto e vira o único acesso ativo.
    if (!resend && trusted) {
      await admin.from('trusted_devices').update({ last_used_at: nowIso, label }).eq('id', trusted.id)
      await markActive(admin, user.id, deviceHash)
      return json({ status: 'ok', revoke_others: true })
    }

    // Estreia: quem já estava logado antes da proteção tem o aparelho reconhecido.
    if (!resend && !fresh && !active && !shared) {
      await admin.from('trusted_devices').upsert(
        {
          user_id: user.id,
          device_hash: deviceHash,
          label,
          last_used_at: nowIso,
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        { onConflict: 'user_id,device_hash' },
      )
      await markActive(admin, user.id, deviceHash)
      return json({ status: 'ok' })
    }

    if (!user.email) return json({ status: 'ok', reason: 'no_email' })

    // Reaproveita código recente para não disparar e-mails em sequência.
    const { data: last } = await admin
      .from('login_challenges')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('device_hash', deviceHash)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last && Date.now() - new Date(last.created_at).getTime() < RESEND_COOLDOWN_MS) {
      return json({ status: 'code_required', email: maskEmail(user.email), cooldown: true })
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
    const codeHash = await sha256(`${user.id}:${deviceHash}:${code}`)
    const { data: challenge, error: chErr } = await admin
      .from('login_challenges')
      .insert({
        user_id: user.id,
        device_hash: deviceHash,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      })
      .select('id')
      .single()
    if (chErr) throw chErr

    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    const when = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    await sendTemplateEmailWithLog('login-code', user.email, {
      idempotencyKey: `login-code-${challenge.id}`,
      templateData: {
        name: profile?.full_name?.split(' ')[0] ?? undefined,
        code,
        device: label ?? undefined,
        when,
      },
    })

    return json({ status: 'code_required', email: maskEmail(user.email) })
  } catch (err) {
    // Nunca travar o login do médico por falha nossa: libera e registra.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[device-check] falha, liberando acesso', message.slice(0, 200))
    await admin.from('security_events').insert({
      user_id: user.id,
      function_name: 'device-check',
      event_type: 'device_guard_fail_open',
      excerpt: message.slice(0, 300),
      metadata: {},
    }).then(() => {}, () => {})
    try {
      await markActive(admin, user.id, deviceHash)
    } catch { /* ignore */ }
    return json({ status: 'ok', fail_open: true, revoke_others: true })
  }
})
