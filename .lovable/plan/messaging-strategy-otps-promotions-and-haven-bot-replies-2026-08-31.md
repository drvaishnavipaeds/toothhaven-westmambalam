# Messaging strategy: OTPs, promotions, and Haven bot replies

## What you already have

- **WhatsApp Cloud API (Meta, direct)** is already wired in: `whatsapp-send` (staff replies), `whatsapp-webhook` (inbound + Haven AI auto-reply, delivery statuses), and template OTP sending inside `portal-otp` and `admin-phone-otp`.
- **Email OTP** through the branded `auth-email-hook` on `notify.toothhaven.in` — already working for admin and patient sign-in.
- **CallMeBot** is still used for owner alerts in `appointment-notification` and `payment-notification` (a hobby-grade relay, not reliable for clinic use).
- **Admin WhatsApp Inbox** (`WhatsAppInbox.tsx`) with realtime threads and a 2-hour staff-takeover pause on the bot.
- **Whatsable/Notifyer** was scoped in an earlier plan but never built, and no secrets were added.

The recurring failures (`#132001` template name not found, `#133010`) are **template configuration issues in your Meta WhatsApp Manager**, not a platform limitation. Switching vendors would not remove them — every WhatsApp provider uses the same Meta templates underneath.

## Recommendation: stay on Meta Cloud API (direct)

Direct Cloud API is the cheapest option that exists — you pay Meta's per-message rate with **zero platform fee**. Every "free tier" tool (Whatsable, Twilio, Interakt, Wati, AiSensy) adds either a monthly subscription or a per-message markup on top of the same Meta rates.

Indicative India rates paid to Meta directly:
- Service conversations (patient messages you first, you reply within 24h): **free, unlimited** — this covers all Haven bot replies.
- Authentication (OTP) template: roughly ₹0.11-0.13 per message.
- Utility (appointment reminder, bill, recall): roughly ₹0.11-0.13.
- Marketing (promotions/offers): roughly ₹0.78.

At ~500 OTPs plus ~500 reminders and ~300 promos a month that is around ₹350/month, versus ₹2,000-3,000/month minimum on any subscription BSP.

So the right move is **not a new tool** — it is finishing and fixing what is already built. Drop the Whatsable direction.

## Step-by-step: what gets done

### Step 1 — Fix the template layer (root cause of the OTP failures)
Templates you create once in WhatsApp Manager, then the code stops guessing at names:
- `th_otp` — Authentication category, English, one body variable and a copy-code button.
- `th_appointment_reminder` — Utility, variables for name, date, time.
- `th_payment_receipt` — Utility, variables for name, amount, invoice number.
- `th_recall_checkup` — Marketing, for six-month recall campaigns.
- Tamil versions of each, added as a second language on the same template name.

Then remove the fallback-guessing logic from `portal-otp` and `admin-phone-otp`, replace it with a single shared sender that reads the approved template name, and surface the actual Meta error text in the admin UI instead of a generic failure.

### Step 2 — One shared WhatsApp module
A `_shared/whatsapp.ts` used by every function: normalises the phone number, picks template vs free-text based on whether the 24-hour window is open, logs every send into `whatsapp_messages`, and never duplicates fetch code across five functions.

Rewires `portal-otp`, `admin-phone-otp`, `whatsapp-send`, `whatsapp-webhook`.

### Step 3 — Retire CallMeBot
`appointment-notification` and `payment-notification` switch to the shared module so owner alerts go through the same verified business number, with delivery receipts visible in the inbox.

### Step 4 — Promotional campaigns (new admin screen)
A **Campaigns** page in the admin portal:
- Pick an audience: all patients, patients not seen in 6 months, patients with an accepted-but-unstarted treatment plan, or a manual list.
- Pick an approved marketing template, fill the variables, preview the rendered message.
- Send now or schedule; a queue table plus a cron-triggered function paces sends and records per-recipient delivery status.
- Opt-out handling: a `whatsapp_opt_out` flag set automatically when a patient replies STOP, respected by every campaign send.

### Step 5 — Haven bot inside WhatsApp
The webhook already auto-replies with Gemini. It gets upgraded to match the portal bot:
- Access to the patient's own appointments and treatment plans (looked up by phone) so it can answer "when is my next visit".
- Booking capture: collects name, service and preferred date, then writes a real row into `appointments` and pings the clinic.
- Escalation: if the patient asks for a human or the bot is unsure, it flags the thread in the admin inbox instead of guessing.
- Keeps the existing 2-hour staff-takeover pause.

### Step 6 — SMS fallback (optional, decide later)
WhatsApp cannot reach a patient without WhatsApp. If you want full coverage, MSG91 or Fast2SMS transactional SMS costs ~₹0.15-0.20 per SMS with no monthly fee, used only when a WhatsApp OTP fails. Not built unless you ask.

## What you need to do (only these)

1. In Meta WhatsApp Manager, create the five templates above and wait for approval (authentication and utility usually approve within minutes).
2. Confirm your business number is verified and the payment method on the Meta ad account is active — `#133010` usually means the number is not registered for Cloud API messaging.
3. Tell me the approved template names and I will wire them in.

No new secrets or vendor accounts are needed; `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are already stored.

## Technical notes

- New: `supabase/functions/_shared/whatsapp.ts`, `supabase/functions/campaign-send/index.ts` (cron-paced), `src/components/admin/CampaignsManager.tsx`.
- Edited: `portal-otp`, `admin-phone-otp`, `whatsapp-send`, `whatsapp-webhook`, `appointment-notification`, `payment-notification`, `AdminSidebar.tsx`, `AdminDashboard.tsx`.
- Migration: `campaigns` and `campaign_recipients` tables (staff-only RLS plus grants), `whatsapp_opt_out boolean` on `patients`, `template_name` and `status` columns on `whatsapp_messages` if absent.
- Cron via `pg_cron` calling `campaign-send` every minute to drain the queue within Meta's rate limits.
- Meta errors are logged with full status and body and returned to the admin UI verbatim.
