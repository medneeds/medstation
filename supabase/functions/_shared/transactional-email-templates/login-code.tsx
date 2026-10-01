/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LoginCodeProps {
  name?: string
  code?: string
  device?: string
  when?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const LoginCodeEmail = ({ name, code = '000000', device, when }: LoginCodeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de acesso à MedStation: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI</Text>
        <Heading style={h1}>{name ? `${name}, confirme que é você` : 'Confirme que é você'}</Heading>
        <Text style={text}>
          Detectamos um acesso à sua conta em um aparelho novo. Digite o código abaixo para entrar:
        </Text>
        <Text style={codeStyle}>{code}</Text>
        <Text style={text}>
          {device ? `Aparelho: ${device}` : null}
          {device && when ? <br /> : null}
          {when ? `Horário: ${when}` : null}
        </Text>
        <Text style={footer}>
          O código vale por 10 minutos. Ao entrar, os outros aparelhos conectados à sua conta serão desconectados.
          Se não foi você, ignore este e-mail e troque sua senha.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoginCodeEmail,
  subject: (data: LoginCodeProps) => `Seu código de acesso: ${data?.code ?? ''}`.trim(),
  displayName: 'Código de acesso em aparelho novo',
  previewData: { name: 'Dr. Artur', code: '482913', device: 'Chrome no Windows', when: '01/10/2026 07:30' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Helvetica, Arial, sans-serif" }
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
const codeStyle = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '34px',
  fontWeight: 700 as const,
  letterSpacing: '8px',
  color: INK,
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', lineHeight: '1.55', color: '#999999', margin: '28px 0 0' }
