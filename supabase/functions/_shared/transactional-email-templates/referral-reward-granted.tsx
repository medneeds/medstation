/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReferralRewardProps {
  name?: string
  days?: number
  expiresAt?: string
  mode?: 'courtesy' | 'credit'
  appUrl?: string
  referralUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const formatDate = (iso?: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

const ReferralRewardEmail = ({
  name,
  days = 30,
  expiresAt,
  mode = 'courtesy',
  appUrl = 'https://medstation-ai.com.br',
  referralUrl = 'https://medstation-ai.com.br/indicar',
}: ReferralRewardProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Sua indicação virou ${days} dias de acesso na MedStation AI`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>
          {name ? `${name}, sua indicação foi confirmada` : 'Sua indicação foi confirmada'}
        </Heading>

        <Text style={p}>
          {mode === 'courtesy'
            ? `Um colega assinou pelo seu link. Liberamos ${days} dias de acesso completo à plataforma na sua conta — sem cobrança e sem cartão.`
            : `Um colega assinou pelo seu link. Adicionamos ${days} dias grátis à sua próxima fatura, automaticamente.`}
        </Text>

        <Section style={box}>
          <Text style={boxLabel}>ACESSO LIBERADO ATÉ</Text>
          <Text style={boxValue}>{formatDate(expiresAt) || `${days} dias a partir de hoje`}</Text>
        </Section>

        {mode === 'courtesy' ? (
          <Text style={p}>
            Ao final desse período o acesso é encerrado automaticamente. Cada nova indicação
            confirmada renova por mais {days} dias.
          </Text>
        ) : null}

        <Button style={cta} href={appUrl}>
          Acessar a plataforma
        </Button>

        <Hr style={hr} />

        <Text style={small}>
          Continue indicando colegas pelo seu link e mantenha o acesso ativo: {referralUrl}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReferralRewardEmail,
  subject: 'Sua indicação foi confirmada — acesso liberado',
  displayName: 'Indicação confirmada',
  previewData: {
    name: 'Dr. Artur',
    days: 30,
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    mode: 'courtesy',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '11px',
  letterSpacing: '0.25em',
  color: SAGE,
  fontWeight: 700 as const,
  margin: '0 0 20px',
}
const h1 = { fontSize: '24px', color: INK, margin: '0 0 16px', lineHeight: '1.25' }
const p = { fontSize: '15px', color: MUTED, lineHeight: '1.6', margin: '0 0 16px' }
const box = {
  border: `1px solid ${SAGE}33`,
  backgroundColor: '#f4f8f6',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '0 0 20px',
}
const boxLabel = { fontSize: '10px', letterSpacing: '0.18em', color: MUTED, margin: '0 0 6px' }
const boxValue = { fontSize: '18px', color: INK, fontWeight: 600 as const, margin: 0 }
const cta = {
  backgroundColor: SAGE,
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 22px',
  fontSize: '14px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#eaeaea', margin: '28px 0 16px' }
const small = { fontSize: '12px', color: MUTED, lineHeight: '1.6', margin: 0 }
