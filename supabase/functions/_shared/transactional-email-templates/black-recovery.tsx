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

// Lembretes da Black para quem começou a compra e não concluiu (black-recovery-reminders).
// Copy revisada: sem parcelamento, Pix, boleto, "% off" ou "de/por".

type Step = '1h' | '24h'

interface BlackRecoveryProps {
  continueUrl?: string
  unsubscribeUrl?: string
}

const SAGE = '#478A70'
const INK = '#141414'
const MUTED = '#5b5b5b'
const WHATSAPP_URL = 'https://wa.me/5598981659576'

const BENEFITS = [
  'Assistentes clínicos para anamnese, evolução, prescrição, exames e atestados',
  'Modo Escuta: a consulta vira anamnese enquanto você atende',
  'Todas as novidades lançadas durante os seus 12 meses',
  'E-book Arsenal Med 3.0 incluso, sem custo extra',
]

const COPY: Record<Step, { preview: string; subject: string; title: string; intro: string[]; button: string }> = {
  '1h': {
    subject: 'Seu ano de MedStation ficou esperando',
    preview: 'Você começou a garantir a Black MedStation e o pagamento não foi concluído.',
    title: 'Seu ano de MedStation ficou esperando',
    intro: [
      'Você começou a garantir a Black MedStation, mas o pagamento não foi concluído. Pode ter sido o cartão, a conexão ou só a correria do plantão.',
      'Seu lugar continua aqui. É só retomar de onde parou:',
    ],
    button: 'Continuar minha compra',
  },
  '24h': {
    subject: 'A Black MedStation vai até 30/11',
    preview: 'R$ 399,90 por 12 meses, pagamento único no cartão. A oferta vai até 30/11.',
    title: 'A Black MedStation vai até 30/11',
    intro: [
      'Ontem você começou a garantir a Black MedStation e a compra ficou pela metade.',
      'A oferta vale até 30 de novembro: R$ 399,90 pelos 12 meses, com o e-book Arsenal Med 3.0 incluso, pagamento único no cartão e sem renovação automática. A partir de 1º/12, o plano anual passa a custar R$ 999,90.',
    ],
    button: 'Garantir meu ano',
  },
}

function makeEmail(step: Step) {
  const c = COPY[step]
  return ({
    continueUrl = 'https://medstation-ai.com.br/black',
    unsubscribeUrl = 'https://medstation-ai.com.br/descadastrar',
  }: BlackRecoveryProps) => (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MEDSTATION AI</Text>
          <Heading style={h1}>{c.title}</Heading>
          {c.intro.map((p) => (
            <Text key={p} style={text}>{p}</Text>
          ))}
          <Section style={{ margin: '0 0 26px' }}>
            <Button style={button} href={continueUrl}>
              {c.button}
            </Button>
          </Section>
          <Text style={kicker}>NOS SEUS 12 MESES</Text>
          {BENEFITS.map((b) => (
            <Text key={b} style={bullet}>• {b}</Text>
          ))}
          <Text style={{ ...text, marginTop: '18px' }}>
            Você tem 7 dias de garantia incondicional: se não fizer sentido na sua rotina, devolvemos 100% do valor, sem precisar justificar.
          </Text>
          <Text style={text}>
            Se ficou alguma dúvida, responda este e-mail ou fale comigo no{' '}
            <Link href={WHATSAPP_URL} style={link}>WhatsApp (98) 98165-9576</Link>.
          </Text>
          <Text style={signature}>
            Dr. Artur Batista
            <br />
            Médico · CRM/MA 11788 · Fundador da MedStation
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Você recebeu este e-mail porque informou este endereço para comprar a Black MedStation e o pagamento não foi concluído. Se já comprou, pode ignorar.{' '}
            <Link href={unsubscribeUrl} style={footerLink}>Não quero mais receber estes e-mails</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const previewData = (step: Step) => ({
  continueUrl: `https://medstation-ai.com.br/black?utm_source=email&utm_medium=recovery&utm_campaign=black_2026&utm_content=${step}`,
  unsubscribeUrl: 'https://medstation-ai.com.br/descadastrar?token=exemplo',
})

export const template1h = {
  component: makeEmail('1h'),
  subject: COPY['1h'].subject,
  displayName: 'Black: compra não concluída (1 h)',
  previewData: previewData('1h'),
} satisfies TemplateEntry

export const template24h = {
  component: makeEmail('24h'),
  subject: COPY['24h'].subject,
  displayName: 'Black: compra não concluída (24 h)',
  previewData: previewData('24h'),
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
const text = { fontSize: '15px', color: MUTED, lineHeight: '1.6', margin: '0 0 16px' }
const kicker = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '11px',
  letterSpacing: '1.5px',
  color: INK,
  margin: '0 0 8px',
}
const bullet = { fontSize: '14px', color: MUTED, lineHeight: '1.5', margin: '0 0 6px' }
const button = {
  backgroundColor: SAGE,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '6px',
  padding: '12px 22px',
  textDecoration: 'none',
}
const link = { color: SAGE, textDecoration: 'underline' }
const signature = { fontSize: '14px', color: INK, lineHeight: '1.5', margin: '22px 0 0' }
const hr = { borderColor: '#e6e8e7', margin: '26px 0 16px' }
const footer = { fontSize: '12px', lineHeight: '1.55', color: '#999999', margin: '0' }
const footerLink = { color: '#777777', textDecoration: 'underline' }
