## Goal

Provide a webhook URL you can paste into the Meta Developer portal for the WhatsApp Cloud API integration, and implement the endpoint that Meta requires to verify and receive events.

## Why this is needed

Meta requires every WhatsApp Cloud API app to register a callback URL. The endpoint must answer Meta’s GET verification challenge and accept POST event payloads. The project currently sends WhatsApp OTPs but has no webhook receiver, so the dashboard webhook field cannot be filled.

## Plan

1. **Create a new edge function `whatsapp-webhook`** at `supabase/functions/whatsapp-webhook/index.ts`.
   - `GET` handler: read `hub.mode`, `hub.verify_token`, and `hub.challenge` from the query string. If `hub.mode === "subscribe"` and the token matches the `META_WEBHOOK_VERIFY_TOKEN` secret, return the `hub.challenge` value as plain text (status 200). Otherwise return 403.
   - `POST` handler: immediately return 200 (required by Meta), then parse the JSON payload and log useful fields for debugging (message status, delivery, errors, incoming messages). No state change unless needed.
   - `OPTIONS` handler: CORS preflight.

2. **Add a runtime secret `META_WEBHOOK_VERIFY_TOKEN`**. This is the token you will also paste into the Meta webhook Verify Token field. It can be any strong random string you choose; I will generate one and store it securely.

3. **Deploy the edge function** so it becomes reachable at the project functions URL.

4. **Deliver the exact URL and verify token** for you to paste into Meta Developers → WhatsApp → Configuration → Webhooks.

## Out of scope

- Processing incoming WhatsApp messages (beyond logging).
- Changing the existing OTP sending logic (`portal-otp` or `admin-phone-otp`).
- Setting up a custom domain proxy for the webhook.

## Verification

- Use `curl` to simulate Meta’s GET verification and confirm the challenge is echoed.
- Use `curl` to POST a sample WhatsApp status payload and confirm the function returns 200.
- Share the webhook URL and verify token for you to copy into the Meta dashboard.