# Whatsable (Notifyer) WhatsApp Integration

## Step 0 — Add secrets first (you)

Add these in Project settings → Secrets. Do not paste them in chat or in code.

- `NOTIFYER_API_BASE_URL` = `https://api.insightssystem.com`
- `NOTIFYER_API_TOKEN` = your JWT from the Whatsable console

Nothing below can be tested until both exist. Tell me when they're set (or approve this plan and I'll open the secret prompt for you).

## What gets built

Today the clinic sends WhatsApp through the Meta Cloud API directly, which keeps failing with template errors (`#132001`, `#133010`) for patient OTP, admin OTP and notifications. Whatsable becomes the single outbound/inbound channel, with Meta code retired once the new path is verified.

### 1. Shared Whatsable client
A small server-side helper used by every function: reads the base URL and token from Secrets, and exposes two request styles — Console API (`Authorization: Bearer <token>`, `Origin: https://console.notifyer-systems.com`) for templates, bots, broadcasts and webhooks, and Chat API (`Authorization: <token>` with no prefix, `Origin: https://chat.notifyer-systems.com`) for recipients, messaging, labels and handoff. Never logs the token.

### 2. Send flow
One `whatsable-send` function handling every outbound message:
- Free-form text when the 24-hour customer-service window is open.
- Approved template send when the window is closed (OTP, appointment reminders, payment receipts).
- Recipient lookup/creation in the Chat API before sending; labels applied as `global_label` string names.
- Scheduling supported: timestamp in ms since epoch, `0` = immediate.
- Every send mirrored into the existing `whatsapp_messages` table so the inbox stays the source of truth.

Callers rewired to it: patient portal OTP, admin phone OTP, appointment notifications, payment notifications.

### 3. Inbox flow
- New Whatsable webhook receiver registered via the webhooks API group; verifies the shared secret, stores inbound messages and delivery/read status into `whatsapp_messages`, and preserves the current Haven AI auto-reply-until-staff-takeover behaviour.
- `WhatsAppInbox.tsx` in the admin portal gains: template picker for out-of-window replies, label chips, scheduled-send option, delivery-status ticks, and a staff handoff toggle backed by the Chat API.

### 4. Templates and admin surface
- Admin screen listing approved templates pulled from the templates API group, so staff can see exactly which templates exist and in which language before sending.
- OTP send picks an approved authentication template automatically instead of the hardcoded `otp_verification` name that keeps breaking.

### 5. Cleanup
Once a live OTP and a live inbound reply both succeed through Whatsable, the Meta Cloud API code paths and their secrets are removed.

## Technical notes

- New: `supabase/functions/_shared/whatsable.ts`, `supabase/functions/whatsable-send/index.ts`, `supabase/functions/whatsable-webhook/index.ts`.
- Edited: `portal-otp`, `admin-phone-otp`, `appointment-notification`, `payment-notification`, `src/components/admin/WhatsAppInbox.tsx`.
- API groups used: `/api:AFRA_QCy/` templates, `/api:bVXsw_FD/` chat + messaging, `/api:0hqyGRIz/` webhooks, `/api:qh9OQ3OW/` logs/analytics, `/api:Mk_r6mq0/` broadcasts (reserved for later recall campaigns).
- `PATCH /web/recipient/:id` always preceded by a `GET` of the full record; the full field set is echoed back in the body.
- No schema migration needed — `whatsapp_messages` already covers direction, body, status and patient linkage; a nullable provider-message-id column is added if the existing one doesn't fit Whatsable's ID format.
- Reference: https://github.com/Whatsable/whatsapp-business-agent-skills and https://whatsable.app/vibe-code.
