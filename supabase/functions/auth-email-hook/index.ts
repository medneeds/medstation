import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createAuthEmailHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { PurchaseActivationEmail } from '../_shared/email-templates/purchase-activation.tsx'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { findUserByEmail } from '../_shared/admin-users.ts'
import {
  PURCHASE_ACTIVATION_SUBJECT,
  mayBePurchaseActivation,
  paymentPlanOf,
  purchasedPlanSummary,
  shouldUsePurchaseActivationEmail,
  type ActivationAuthUser,
  type AuthEmailAction,
} from '../_shared/purchase-activation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration
const SITE_NAME = "MedStation"
const SENDER_DOMAIN = "notify.medstation-ai.com.br"
const ROOT_DOMAIN = "medstation-ai.com.br"
const FROM_DOMAIN = "medstation-ai.com.br"
const SITE_URL = `https://${ROOT_DOMAIN}`
// Mesmo contato de src/config/company.ts (COMPANY.contactEmail).
const SUPPORT_EMAIL = "contato@medstation-ai.com.br"

// Template mapping for preview mode
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
  // Convite vindo de um pagamento confirmado (ver purchaseActivationContent).
  invite_purchase: PurchaseActivationEmail,
}

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://medstation-ai.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    oldEmail: SAMPLE_EMAIL,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
  invite_purchase: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    planName: 'Black MedStation',
    planDetails: ['12 meses de acesso completo', 'Pagamento único no cartão de crédito', 'Sem renovação automática'],
    supportEmail: SUPPORT_EMAIL,
  },
}

/**
 * Conta criada por um pagamento e ainda não ativada: troca o convite genérico
 * ("você foi convidado… se não esperava, ignore", que parece spam para quem
 * acabou de pagar) pelo e-mail de compra com o botão de ativação. Vale também
 * para o "Reenviar link de acesso" da /obrigado (signup/magiclink com
 * ?ativacao=compra no redirect). Qualquer falha cai no e-mail padrão.
 */
async function purchaseActivationContent(
  actionType: AuthEmailAction,
  data: { email: string; url: string },
): Promise<{ subject: string; element: React.ReactElement } | null> {
  if (!mayBePurchaseActivation(actionType, data.url)) return null
  try {
    const url = Deno.env.get('SUPABASE_URL')
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !key) return null
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const user = (await findUserByEmail(
      (params) => admin.auth.admin.listUsers(params) as any,
      data.email,
    )) as ActivationAuthUser | null
    if (!shouldUsePurchaseActivationEmail({ actionType, url: data.url, user })) return null
    const plan = purchasedPlanSummary(paymentPlanOf(user))
    return {
      subject: PURCHASE_ACTIVATION_SUBJECT,
      element: React.createElement(PurchaseActivationEmail, {
        siteName: SITE_NAME,
        confirmationUrl: data.url,
        recipient: data.email,
        planName: plan?.name ?? null,
        planDetails: plan?.details ?? [],
        supportEmail: SUPPORT_EMAIL,
      }),
    }
  } catch (error) {
    console.error('[auth-email-hook] purchase activation lookup failed', (error as Error)?.message)
    return null
  }
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const handler = createAuthEmailHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: Deno.env.get('LOVABLE_SEND_URL'),
  emails: {
    signup: async (data) =>
      (await purchaseActivationContent('signup', data)) ?? {
        subject: 'Confirme seu e-mail — MedStation',
        element: React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
        }),
      },
    invite: async (data) =>
      (await purchaseActivationContent('invite', data)) ?? {
        subject: 'Você foi convidado para a MedStation',
        element: React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
        }),
      },
    magiclink: async (data) =>
      (await purchaseActivationContent('magiclink', data)) ?? {
        subject: 'Seu link de acesso — MedStation',
        element: React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
        }),
      },
    recovery: {
      subject: 'Redefinição de senha — MedStation',
      render: (data) =>
        React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          token: data.token ?? undefined,
          codeUrl: `${SITE_URL}/reset-password`,
        }),
    },
    email_change: {
      subject: 'Confirme seu novo e-mail — MedStation',
      render: (data) =>
        React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
        }),
    },
    reauthentication: {
      subject: 'Seu código de verificação — MedStation',
      render: (data) =>
        React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
    },
  },
})

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  return handler(req)
})
