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

interface LegacyTrialInviteProps {
  name?: string
  claimUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const LegacyTrialInviteEmail = ({
  name,
  claimUrl = 'https://medstation-ai.com.br/dashboard?convite=7dias',
}: LegacyTrialInviteProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sem cartão, sem cobrança — é só ativar.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION</Text>
        <Heading style={h1}>
          {name ? `${name}, abrimos a MedStation inteira para você` : 'Abrimos a MedStation inteira para você'}
        </Heading>
        <Text style={text}>
          Você já conhece o Examinus. Agora liberamos, por 7 dias, tudo o que a
          plataforma faz por um plantão inteiro — sem você digitar duas vezes a
          mesma coisa.
        </Text>

        <Text style={kicker}>O QUE ABRE PARA VOCÊ</Text>
        <Text style={item}>• 12 assistentes clínicos: anamnese, exames, gasometria, prescrição, parecer, alta, ética e mais.</Text>
        <Text style={item}>• Modo Escuta: a consulta acontece, a anamnese sai pronta para copiar.</Text>
        <Text style={item}>• Modo Rotineiro: a visita de enfermaria e UTI evoluída leito a leito.</Text>

        <Section style={{ margin: '26px 0 24px' }}>
          <Button style={button} href={claimUrl}>
            Ativar meus 7 dias
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={kicker}>SEM PEGADINHA</Text>
        <Text style={text}>
          Não pedimos cartão. Não há cobrança automática. Não existe assinatura
          para cancelar depois. Quando os 7 dias terminarem, sua conta
          simplesmente volta ao que era.
        </Text>

        <Text style={closing}>Menos digitação, mais medicina.</Text>

        <Text style={footer}>
          Você recebeu este e-mail porque tem uma conta na MedStation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LegacyTrialInviteEmail,
  subject: 'Abrimos a MedStation inteira para você por 7 dias',
  displayName: 'Convite — 7 dias completos',
  previewData: {
    name: 'Dr. Artur',
    claimUrl: 'https://medstation-ai.com.br/dashboard?convite=7dias',
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
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: MUTED,
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const item = {
  fontSize: '15px',
  color: MUTED,
  lineHeight: '1.6',
  margin: '0 0 8px',
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
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '6px',
  padding: '14px 26px',
  textDecoration: 'none',
}
const closing = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: INK,
  margin: '0 0 8px',
}
const hr = { borderColor: '#e6e8e7', margin: '8px 0 24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0' }
