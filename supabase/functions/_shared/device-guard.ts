import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

export const TRUST_DAYS = 30
export const CODE_TTL_MS = 10 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
export const MAX_ATTEMPTS = 5

export function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isValidDeviceId(v: unknown): v is string {
  return typeof v === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(v)
}

export async function authenticate(
  req: Request,
): Promise<{ user: User; admin: SupabaseClient } | Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'config' }, 500)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data, error } = await authed.auth.getUser()
  if (error || !data?.user) return json({ error: 'Unauthorized' }, 401)
  return { user: data.user, admin: createClient(supabaseUrl, serviceKey) }
}

export async function markActive(admin: SupabaseClient, userId: string, deviceHash: string) {
  const { error } = await admin
    .from('active_sessions')
    .upsert({ user_id: userId, device_hash: deviceHash }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function trustDevice(admin: SupabaseClient, userId: string, deviceHash: string, label: string | null) {
  const now = new Date()
  const { error } = await admin.from('trusted_devices').upsert(
    {
      user_id: userId,
      device_hash: deviceHash,
      label,
      last_used_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TRUST_DAYS * 86400000).toISOString(),
    },
    { onConflict: 'user_id,device_hash' },
  )
  if (error) throw error
}

export function cleanLabel(v: unknown): string | null {
  return typeof v === 'string' ? v.slice(0, 80) : null
}
