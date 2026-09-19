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
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
  codeUrl?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
  codeUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinir sua senha na {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Redefinir sua senha</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a senha da sua conta na {siteName}.
          Clique no botão abaixo para escolher uma nova senha.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir senha
        </Button>
        {token ? (
          <>
            <Text style={text}>
              Se o botão não funcionar ou disser que o link expirou, use o
              código abaixo em{' '}
              <a href={codeUrl} style={link}>
                {codeUrl}
              </a>
              :
            </Text>
            <Text style={code}>{token}</Text>
            <Text style={text}>O código vale por 1 hora.</Text>
          </>
        ) : null}
        <Text style={footer}>
          Se você não pediu a redefinição, pode ignorar este e-mail com
          segurança. Sua senha continuará a mesma.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const link = { color: '#15803d', textDecoration: 'underline' }
const code = {
  fontSize: '30px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  color: '#000000',
  margin: '10px 0 0',
}
