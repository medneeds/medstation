/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BoletoReminderProps {
  stage?: 'day_after' | 'last_day'
  voucherUrl?: string
  dueDate?: string
  amount?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const BoletoReminderEmail = ({
  stage = 'day_after',
  voucherUrl = 'https://medstation-ai.com.br',
  dueDate,
  amount,
}: BoletoReminderProps) => {
  const lastDay = stage === 'last_day'
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {lastDay ? 'Seu boleto da MedStation vence hoje' : 'Seu boleto da MedStation está aguardando pagamento'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MEDSTATION AI</Text>
          <Heading style={h1}>
            {lastDay ? 'Seu boleto vence hoje' : 'Seu boleto está pronto para pagar'}
          </Heading>
          <Text style={text}>
            Você gerou um boleto para o plano anual da MedStation
            {amount ? ` no valor de ${amount}` : ''}
            {dueDate ? `, com vencimento em ${dueDate}` : ''}.
            {lastDay
              ? ' Hoje é o último dia para pagar. Depois disso, o boleto deixa de valer.'
              : ' Ele ainda não foi pago.'}
          </Text>
          <Text style={text}>
            O acesso de 12 meses é liberado assim que o banco confirmar o pagamento, o que costuma levar até 1 dia útil.
          </Text>
          <Section style={{ margin: '0 0 26px' }}>
            <Button style={button} href={voucherUrl}>
              Abrir meu boleto
            </Button>
          </Section>
          <Text style={footer}>
            Se você já pagou, pode ignorar esta mensagem. A MedStation nunca pede dados bancários por e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BoletoReminderEmail,
  subject: (data: BoletoReminderProps) =>
    data?.stage === 'last_day'
      ? 'Seu boleto da MedStation vence hoje'
      : 'Seu boleto da MedStation está aguardando pagamento',
  displayName: 'Lembrete de boleto em aberto',
  previewData: {
    stage: 'day_after',
    voucherUrl: 'https://medstation-ai.com.br',
    dueDate: '04/11/2026',
    amount: 'R$ 399,90',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', Helvetica, Arial, sans-serif",
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '11px',
  letterSpacing: '2px',
  color: SAGE,
  margin: '0 0 20px',
}
const h1 = { fontSize: '24px', fontWeight: 600 as const, color: INK, margin: '0 0 16px' }
const text = { fontSize: '15px', color: MUTED, lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: SAGE,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '6px',
  padding: '12px 22px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', lineHeight: '1.55', color: '#999999', margin: '28px 0 0' }
