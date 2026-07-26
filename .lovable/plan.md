## Goal

Let new patients register themselves from the Patient Portal login screen, then sign in immediately with the same WhatsApp or Email OTP flow already used for existing patients.

## UX

On the Patient Portal login card, add a top-level tab pair: **Sign In** / **Register**.

Register flow (mobile-first, matches existing card styling):

1. Choose method: WhatsApp or Email (same toggle as sign-in).
2. Fill registration form:
   - Full name (required)
   - Phone (10 digits, required)
   - Email (required if Email method; optional if WhatsApp)
   - Date of birth (optional)
   - Gender (optional)
   - Consent checkbox: "I agree to be contacted for appointments and updates" (required)
3. Tap **Send OTP** → 6-digit code delivered via chosen channel.
4. Enter code → **Verify & Create Account**.
5. On success: patient record is created, session is stored (same `portal_session_v1` key), user lands in the logged-in portal view.

Duplicate handling: if phone or email already matches an existing patient, show "An account already exists — please sign in instead" with a one-tap switch to the Sign In tab (prefilled).

## Implementation

### Backend

Extend `supabase/functions/portal-otp/index.ts` with two new actions so RLS stays locked to staff:

- `register_send`: input `{ name, phone, email?, dob?, gender?, method }`. Validates with Zod, checks `patients` for existing phone/email (returns `already_exists`), stashes pending registration payload keyed by phone in `portal_otp_codes` (reuse table; add a `pending_registration jsonb` column via migration), then sends WhatsApp OTP (existing helper) or triggers Supabase email OTP.
- `register_verify`: input `{ phone or email, code, method }`. Verifies OTP, reads pending payload, inserts into `public.patients` via service role, clears pending payload, returns `{ token, phone }` shaped like the existing verify response.

Email path reuses `supabase.auth.signInWithOtp` from the client (same as current sign-in), and the edge function performs the patient insert after the client confirms verification via a new `register_finalize` action that trusts an authenticated session's email.

Migration:
- `ALTER TABLE public.portal_otp_codes ADD COLUMN pending_registration jsonb;`
- No new GRANTs needed (table already staff-only; edge function uses service role).

### Frontend

`src/pages/PatientPortal.tsx`:
- Add `mode: "signin" | "register"` state and a tab switcher above the existing method toggle.
- Add register form component (inline, no new files needed) with Zod validation.
- Wire `sendOtp` / `verifyOtp` to call `portal-otp` `register_send` / `register_verify` (WhatsApp) or Supabase auth OTP + `register_finalize` (Email).
- On duplicate error, surface a toast + auto-switch to Sign In with the entered phone/email prefilled.

No changes to admin flows, existing sign-in flow, or RLS policies.

## Out of scope

- Editing profile fields after registration (already handled in admin portal).
- Password-based patient accounts.
- Email verification beyond the OTP code itself.
