/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { PURCHASE_ACTIVATION_SUBJECT } from '../purchase-activation.ts'

// E-mail de ativação enviado no lugar do convite genérico quando a conta nasce
// de um pagamento confirmado (ver _shared/purchase-activation.ts).

interface PurchaseActivationEmailProps {
  siteName: string
  confirmationUrl: string
  recipient?: string
  /** Nome do plano; sem plano conhecido, o e-mail não cita detalhes. */
  planName?: string | null
  planDetails?: string[]
  supportEmail: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

export const PurchaseActivationEmail = ({
  siteName,
  confirmationUrl,
  recipient,
  planName,
  planDetails = [],
  supportEmail,
}: PurchaseActivationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Pagamento confirmado. Toque no botão para ativar seu acesso à {siteName}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>Pagamento confirmado</Heading>
        <Text style={text}>
          Obrigado pela compra. Seu acesso à {siteName} fica na conta
          {recipient ? <> do e-mail <strong>{recipient}</strong></> : ' deste e-mail'}. Falta só
          ativar: toque no botão abaixo para entrar, sem precisar de senha.
        </Text>

        {planName ? (
          <Section style={summary}>
            <Text style={summaryTitle}>{planName}</Text>
            {planDetails.map((line) => (
              <Text key={line} style={summaryLine}>
                • {line}
              </Text>
            ))}
          </Section>
        ) : null}

        <Section style={{ margin: '0 0 26px' }}>
          <Button style={button} href={confirmationUrl}>
            Ativar meu acesso
          </Button>
        </Section>

        <Text style={text}>
          Garantia de 7 dias: se desistir em até 7 dias corridos do pagamento, devolvemos 100% do
          valor. É só escrever para{' '}
          <Link href={`mailto:${supportEmail}`} style={link}>
            {supportEmail}
          </Link>{' '}
          com o e-mail da compra.
        </Text>
        <Text style={text}>
          Dúvidas ou problema para entrar? Escreva para{' '}
          <Link href={`mailto:${supportEmail}`} style={link}>
            {supportEmail}
          </Link>
          .
        </Text>

        <Text style={footer}>
          Você recebeu este e-mail porque um pagamento foi feito na {siteName} com este endereço. O
          link de ativação vale por tempo limitado; se ele expirar, peça um novo na tela de
          confirmação da compra ou em medstation-ai.com.br/auth. A {siteName} nunca pede senha ou
          dados do cartão por e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PurchaseActivationEmail

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
const summary = {
  border: '1px solid #e4e4e4',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 0 24px',
}
const summaryTitle = { fontSize: '15px', fontWeight: 600 as const, color: INK, margin: '0 0 6px' }
const summaryLine = { fontSize: '14px', color: MUTED, lineHeight: '1.5', margin: '0' }
const link = { color: SAGE, textDecoration: 'underline' }
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

/**
 * Entrada só para a prévia (preview-transactional-email). O envio de verdade é
 * do auth-email-hook, que tem o link de ativação: não envie por sendTemplateEmail.
 */
export const previewTemplate = {
  component: PurchaseActivationEmail,
  subject: PURCHASE_ACTIVATION_SUBJECT,
  displayName: 'Pagamento confirmado: ativação do acesso (enviado pelo auth-email-hook)',
  previewData: {
    siteName: 'MedStation',
    confirmationUrl: 'https://medstation-ai.com.br',
    recipient: 'user@example.test',
    planName: 'Black MedStation',
    planDetails: ['12 meses de acesso completo', 'Pagamento único no cartão de crédito', 'Sem renovação automática'],
    supportEmail: 'contato@medstation-ai.com.br',
  },
}
