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

interface Props {
  patientName?: string
  documents?: string // e.g. "Terms of Service and Privacy Policy"
  summary?: string
  effectiveDate?: string
  termsUrl?: string
  privacyUrl?: string
}

const Email = ({ patientName, documents, summary, effectiveDate, termsUrl, privacyUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Important update to our {documents || 'legal policies'} at Tooth Haven</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logo}>TOOTH HAVEN</Heading>
          <Text style={tagline}>Advanced Dental Care</Text>
        </Section>
        <Heading style={h1}>Important Legal Update</Heading>
        <Text style={text}>{patientName ? `Dear ${patientName},` : 'Dear Patient,'}</Text>
        <Text style={text}>
          We have updated our {documents || 'Terms of Service and Privacy Policy'}
          {effectiveDate ? `, effective ${effectiveDate}` : ''}. We encourage you to review the
          updated document(s) so you understand how they apply to you.
        </Text>
        {summary ? (
          <Section style={summaryBox}>
            <Text style={summaryTitle}>What changed</Text>
            <Text style={text}>{summary}</Text>
          </Section>
        ) : null}
        <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
          {termsUrl ? (
            <Button href={termsUrl} style={button}>
              Read Terms of Service
            </Button>
          ) : null}
          {privacyUrl ? (
            <Button href={privacyUrl} style={{ ...button, marginLeft: '8px' }}>
              Read Privacy Policy
            </Button>
          ) : null}
        </Section>
        <Text style={text}>
          Your continued use of our services after the effective date indicates your acceptance of
          the updated policies. If you have any questions, reply to this email or contact us at
          +91 89251 66149.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Tooth Haven Advanced Dental Care
          <br />
          24/23 Postal Colony Cross Street, West Mambalam, Chennai – 600033
          <br />
          karthiktoothhaven25@gmail.com · +91 89251 66149
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Important update: ${(data?.documents as string) || 'Terms of Service & Privacy Policy'} — Tooth Haven`,
  displayName: 'Legal policy update',
  previewData: {
    patientName: 'Priya',
    documents: 'Terms of Service and Privacy Policy',
    summary: 'We updated our clinic contact details and effective date.',
    effectiveDate: '1 September 2026',
    termsUrl: 'https://www.toothhaven.in/terms',
    privacyUrl: 'https://www.toothhaven.in/privacy',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '580px', margin: '0 auto' }
const header = { borderBottom: '3px solid #0d9488', paddingBottom: '12px', marginBottom: '20px' }
const logo = { color: '#0d9488', fontSize: '22px', margin: '0', letterSpacing: '1px' }
const tagline = { color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }
const h1 = { color: '#111827', fontSize: '22px' }
const text = { color: '#374151', fontSize: '14px', lineHeight: '22px' }
const summaryBox = {
  backgroundColor: '#f0fdfa',
  border: '1px solid #99f6e4',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
}
const summaryTitle = { color: '#0f766e', fontSize: '13px', fontWeight: 'bold', margin: '0 0 6px' }
const button = {
  backgroundColor: '#0d9488',
  color: '#ffffff',
  fontSize: '14px',
  padding: '10px 18px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }
