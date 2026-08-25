import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.1.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Notification-only bookkeeping: Lovable already enforces suppression at send
// time. These writes keep the project's own email history in sync.
function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(reason: Reason, recipient: string, eventId: string) {
  const supabase = adminClient()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error('suppressed_emails write failed')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (logError) {
    console.error('Failed to insert email_send_log', {
      code: logError.code,
      message: logError.message,
      event_id: eventId,
    })
    throw new Error('email_send_log write failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      await record('bounce', event.data.recipient, event.event_id)
    },
    'email.complaint': async (event) => {
      await record('complaint', event.data.recipient, event.event_id)
    },
    'email.unsubscribed': async (event) => {
      await record('unsubscribe', event.data.recipient, event.event_id)
    },
  },
})

Deno.serve((req) => handler(req))
