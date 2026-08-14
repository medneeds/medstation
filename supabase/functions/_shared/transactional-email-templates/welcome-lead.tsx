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

interface WelcomeLeadProps {
  name?: string
  appUrl?: string
  referralUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const WelcomeLeadEmail = ({
  name,
  appUrl = 'https://medstation-ai.com.br',
  referralUrl = 'https://medstation-ai.com.br/indicar',
}: WelcomeLeadProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo à MedStation — produza mais, digite menos</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>
          {name ? `Boas-vindas, ${name}` : 'Boas-vindas'}
        </Heading>
        <Text style={text}>
          Sua conta está criada. A MedStation reúne assistentes clínicos que
          escrevem com você: anamnese estruturada por voz, interpretação de
          exames, prescrições e orientações — em segundos.
        </Text>

        <Section style={{ margin: '0 0 28px' }}>
          <Button style={button} href={appUrl}>
            Entrar na plataforma
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={kicker}>INDIQUE E GANHE</Text>
        <Text style={text}>
          Cada colega que assinar pelo seu link recebe 50% de desconto no
          primeiro mês — e você ganha 30 dias de acesso gratuito. São até 3
          indicações válidas, ou seja, até 3 meses por nossa conta.
        </Text>
        <Section style={{ margin: '0 0 24px' }}>
          <Button style={buttonGhost} href={referralUrl}>
            Pegar meu link de indicação
          </Button>
        </Section>

        <Text style={footer}>
          Você recebeu este e-mail porque criou uma conta na MedStation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeLeadEmail,
  subject: 'Boas-vindas à MedStation',
  displayName: 'Boas-vindas (lead)',
  previewData: {
    name: 'Dr. Artur',
    appUrl: 'https://medstation-ai.com.br',
    referralUrl: 'https://medstation-ai.com.br/indicar',
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
  margin: '0 0 24px',
}
const kicker = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '11px',
  letterSpacing: '1.5px',
  color: INK,
  margin: '0 0 12px',
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
const buttonGhost = {
  backgroundColor: '#f3f5f4',
  color: INK,
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '6px',
  padding: '12px 22px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e6e8e7', margin: '8px 0 24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0' }
