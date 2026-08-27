import type * as React from 'npm:react@18.3.1'
import { template as welcomeLead } from './welcome-lead.tsx'
import { template as referralRewardGranted } from './referral-reward-granted.tsx'
import { template as legacyTrialInvite } from './legacy-trial-invite.tsx'
import { template as paymentFailed } from './payment-failed.tsx'

export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: React.ComponentType<any>
  // deno-lint-ignore no-explicit-any
  subject: string | ((data: any) => string)
  displayName?: string
  // deno-lint-ignore no-explicit-any
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-lead': welcomeLead,
  'referral-reward-granted': referralRewardGranted,
  'legacy-trial-invite': legacyTrialInvite,
  'payment-failed': paymentFailed,
}
