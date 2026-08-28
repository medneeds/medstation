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

interface PaymentFailedProps {
  name?: string
  billingUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const PaymentFailedEmail = ({
  name,
  billingUrl = 'https://medstation-ai.com.br/settings?billing=recover',
}: PaymentFailedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Não conseguimos renovar sua assinatura da MedStation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>
          {name ? `${name}, precisamos atualizar seu pagamento` : 'Precisamos atualizar seu pagamento'}
        </Heading>
        <Text style={text}>
          A última tentativa de renovação da sua assinatura não foi concluída.
          Isso costuma acontecer por cartão vencido, limite ou bloqueio temporário do banco.
        </Text>
        <Text style={text}>
          Atualize a forma de pagamento para evitar a interrupção do acesso às ferramentas da MedStation.
        </Text>
        <Section style={{ margin: '0 0 26px' }}>
          <Button style={button} href={billingUrl}>
            Atualizar forma de pagamento
          </Button>
        </Section>
        <Text style={footer}>
          Se você já atualizou o pagamento, pode ignorar esta mensagem. A MedStation nunca solicita dados do cartão por e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: 'Atualize seu pagamento para manter a MedStation ativa',
  displayName: 'Falha de pagamento / recuperação',
  previewData: {
    name: 'Dr. Artur',
    billingUrl: 'https://medstation-ai.com.br/settings?billing=recover',
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
const h1 = {
  fontSize: '24px',
  fontWeight: 600 as const,
  color: INK,
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: MUTED,
  lineHeight: '1.6',
  margin: '0 0 20px',
}
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
