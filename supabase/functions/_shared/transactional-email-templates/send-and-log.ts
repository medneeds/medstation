import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from './send-email.ts'

// Server-only helper: sends through Lovable's managed email API and mirrors the
// outcome into the project's own email_send_log table (app history only — it
// never decides whether a send happens).
export async function sendTemplateEmailWithLog(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabase =
    supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

  const log = async (
    status: 'sent' | 'suppressed' | 'failed',
    errorMessage?: string
  ) => {
    if (!supabase) return
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: to,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) {
      console.error('Failed to write email_send_log', {
        code: error.code,
        message: error.message,
        template_name: templateName,
        status,
      })
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, to, options)
    if (result.sent) {
      await log('sent')
    } else {
      await log('suppressed', 'Recipient is suppressed')
    }
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await log('failed', message.slice(0, 1000))
    throw error
  }
}
