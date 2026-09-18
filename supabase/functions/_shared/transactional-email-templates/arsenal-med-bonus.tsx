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

interface ArsenalBonusProps {
  name?: string
  email?: string
  accessUrl?: string
  supportEmail?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const items = [
  '33 cenários do paciente grave: via aérea, PCR, choque, sepse, AVC, intoxicações e mais',
  'Catálogo de fármacos com diluição, concentração final, dose por quilo e ajuste renal',
  'Dez tabelas de bolso: vasoativos por peso, antídotos, sedação, ventilação e Portaria 344',
  'Arquivos para consulta off-line no celular, tablet ou computador',
]

const ArsenalMedBonusEmail = ({
  name,
  email,
  accessUrl = 'https://arsenalmed.com.br/entrar',
  supportEmail = 'suporte@arsenalmed.com.br',
}: ArsenalBonusProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu bônus do plano anual: Arsenal Med 3.0 liberado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>
          {name ? `${name}, seu bônus anual está liberado` : 'Seu bônus anual está liberado'}
        </Heading>

        <Text style={p}>
          Obrigado por assinar o plano anual da MedStation. Junto com a plataforma completa,
          você recebe o Arsenal Med 3.0 — o manual do paciente grave com catálogo de fármacos
          e tabelas de bolso, vendido separadamente por R$ 99,90.
        </Text>

        <Section style={box}>
          <Text style={boxLabel}>O QUE ESTÁ INCLUSO</Text>
          {items.map((item) => (
            <Text key={item} style={li}>• {item}</Text>
          ))}
        </Section>

        <Text style={p}>
          Para acessar, crie sua senha no painel do Arsenal Med usando exatamente este e-mail
          {email ? `: ${email}` : ' (o mesmo da sua assinatura MedStation)'}.
        </Text>

        <Button style={cta} href={accessUrl}>
          Criar meu acesso no Arsenal Med
        </Button>

        <Hr style={hr} />

        <Text style={small}>
          Se o painel não encontrar seu e-mail, responda esta mensagem ou escreva para {supportEmail}.
          Liberamos manualmente em até 1 dia útil.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ArsenalMedBonusEmail,
  subject: 'Seu bônus do plano anual: Arsenal Med 3.0',
  displayName: 'Bônus anual — Arsenal Med',
  previewData: { name: 'Dra. Ana', email: 'ana@exemplo.com' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '11px', letterSpacing: '2px', color: SAGE, fontWeight: 700 as const }
const h1 = { fontSize: '22px', color: INK, margin: '8px 0 16px' }
const p = { fontSize: '15px', lineHeight: '24px', color: INK, margin: '0 0 16px' }
const box = { backgroundColor: '#f4f8f6', borderRadius: '12px', padding: '16px 18px', margin: '0 0 18px' }
const boxLabel = { fontSize: '11px', letterSpacing: '1px', color: SAGE, fontWeight: 700 as const, margin: '0 0 10px' }
const li = { fontSize: '14px', lineHeight: '22px', color: INK, margin: '0 0 8px' }
const cta = {
  backgroundColor: SAGE,
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 20px',
  fontSize: '15px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e6e6e6', margin: '24px 0 16px' }
const small = { fontSize: '12px', lineHeight: '20px', color: MUTED, margin: 0 }
