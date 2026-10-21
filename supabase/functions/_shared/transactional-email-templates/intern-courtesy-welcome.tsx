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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface InternWelcomeProps {
  name?: string
  days?: number
  expiresAt?: string | null
  appUrl?: string
  whatsappUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'

const formatDate = (iso?: string | null) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
  } catch {
    return ''
  }
}

const tips = [
  {
    title: 'Clínicus',
    text: 'Dite ou cole o caso e receba a anamnese e a evolução organizadas, prontas para o prontuário.',
  },
  {
    title: 'Professor clínico',
    text: 'Dentro do Clínicus: estude diagnósticos, sintomas e síndromes de forma direta, entre um plantão e outro.',
  },
  {
    title: 'Examinus',
    text: 'Envie a foto ou o PDF dos exames e receba tudo organizado para a evolução.',
  },
]

const InternWelcomeEmail = ({
  name,
  days = 30,
  expiresAt,
  appUrl = 'https://medstation-ai.com.br/auth',
  whatsappUrl,
}: InternWelcomeProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Seus ${days} dias de acesso gratuito à MedStation começaram`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>MEDSTATION AI · INTERNATO</Text>
        <Heading style={h1}>
          {name ? `${name}, seu acesso está liberado!` : 'Seu acesso está liberado!'}
        </Heading>

        <Text style={p}>
          Que bom ter você com a gente. Você foi um dos primeiros internos da campanha e ganhou{' '}
          {days} dias de acesso completo à MedStation, sem pagar nada e sem cartão.
        </Text>

        <Section style={box}>
          <Text style={boxLabel}>ACESSO GRATUITO ATÉ</Text>
          <Text style={boxValue}>{formatDate(expiresAt) || `${days} dias a partir de hoje`}</Text>
        </Section>

        <Text style={sectionTitle}>POR ONDE COMEÇAR</Text>
        {tips.map((t) => (
          <Text key={t.title} style={tip}>
            <span style={tipTitle}>{t.title}</span>
            {' · '}
            {t.text}
          </Text>
        ))}

        <Button style={cta} href={appUrl}>
          Entrar na MedStation
        </Button>

        <Text style={note}>
          A MedStation é um apoio para você ganhar tempo e segurança. A decisão final continua sendo
          sua, junto com o seu preceptor.
        </Text>

        <Hr style={hr} />

        {whatsappUrl ? (
          <Text style={small}>
            Ficou com alguma dúvida? Chame a gente no{' '}
            <Link href={whatsappUrl} style={link}>
              grupo dos internos no WhatsApp
            </Link>
            .
          </Text>
        ) : null}
        <Text style={small}>
          Bons plantões!
          <br />
          Equipe MedStation · Produza mais. Digite menos.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InternWelcomeEmail,
  subject: (data: InternWelcomeProps) =>
    data?.name
      ? `${data.name}, seus ${data.days ?? 30} dias de MedStation estão liberados`
      : `Seus ${data?.days ?? 30} dias de MedStation estão liberados`,
  displayName: 'Boas-vindas · Cortesia de internos',
  previewData: {
    name: 'Isabela',
    days: 30,
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    appUrl: 'https://medstation-ai.com.br/auth',
    whatsappUrl: 'https://chat.whatsapp.com/LQu9cCmdCagI0swlYUjInY',
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
  margin: '0 0 24px',
}
const boxLabel = { fontSize: '10px', letterSpacing: '0.18em', color: MUTED, margin: '0 0 6px' }
const boxValue = { fontSize: '18px', color: INK, fontWeight: 600 as const, margin: 0 }
const sectionTitle = {
  fontSize: '11px',
  letterSpacing: '0.18em',
  color: SAGE,
  fontWeight: 700 as const,
  margin: '0 0 10px',
}
const tip = { fontSize: '14px', color: MUTED, lineHeight: '1.6', margin: '0 0 10px' }
const tipTitle = { color: INK, fontWeight: 600 as const }
const cta = {
  backgroundColor: SAGE,
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 22px',
  fontSize: '14px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '14px 0 18px',
}
const note = { fontSize: '13px', color: MUTED, lineHeight: '1.6', margin: '0 0 8px' }
const hr = { borderColor: '#eaeaea', margin: '24px 0 16px' }
const small = { fontSize: '12px', color: MUTED, lineHeight: '1.6', margin: '0 0 8px' }
const link = { color: SAGE, textDecoration: 'underline' }
