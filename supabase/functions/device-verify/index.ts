import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  authenticate,
  cleanLabel,
  isValidDeviceId,
  json,
  markActive,
  MAX_ATTEMPTS,
  sha256,
  trustDevice,
} from '../_shared/device-guard.ts'

// Confirma o código enviado por e-mail.
// Body: { device_id, code, label?, shared?: boolean }
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
  const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : ''
  if (code.length !== 6) return json({ status: 'invalid', message: 'Digite os 6 dígitos.' })

  const deviceHash = await sha256(`${user.id}:${body.device_id}`)
  const shared = body.shared === true

  const { data: challenge, error } = await admin
    .from('login_challenges')
    .select('id, code_hash, expires_at, attempts')
    .eq('user_id', user.id)
    .eq('device_hash', deviceHash)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return json({ error: 'server' }, 500)

  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    return json({ status: 'expired', message: 'O código expirou. Peça um novo.' })
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return json({ status: 'locked', message: 'Muitas tentativas. Peça um novo código.' })
  }

  const ok = (await sha256(`${user.id}:${deviceHash}:${code}`)) === challenge.code_hash
  if (!ok) {
    await admin.from('login_challenges').update({ attempts: challenge.attempts + 1 }).eq('id', challenge.id)
    const left = MAX_ATTEMPTS - challenge.attempts - 1
    return json({
      status: left > 0 ? 'invalid' : 'locked',
      message: left > 0 ? `Código incorreto. ${left} tentativa(s) restante(s).` : 'Muitas tentativas. Peça um novo código.',
    })
  }

  await admin.from('login_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challenge.id)
  try {
    if (!shared) await trustDevice(admin, user.id, deviceHash, cleanLabel(body.label))
    await markActive(admin, user.id, deviceHash)
  } catch (e) {
    console.error('[device-verify] falha ao gravar aparelho', e instanceof Error ? e.message : e)
  }
  return json({ status: 'ok', revoke_others: true })
})
