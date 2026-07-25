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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your Tooth Haven login code</Heading>
        <Text style={text}>
          Use the 6-digit code below to sign in to {siteName}. This code will
          expire shortly.
        </Text>
        {token ? <Text style={codeStyle}>{token}</Text> : null}
        <Text style={text}>Or click the button to sign in instantly:</Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '480px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f766e',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#0f766e',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  backgroundColor: '#f0fdfa',
  padding: '18px',
  borderRadius: '10px',
  margin: '0 0 24px',
}
const button = {
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '10px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#64748b', margin: '30px 0 0' }
