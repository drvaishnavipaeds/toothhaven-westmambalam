# Switch Admin Login to Email OTP

Replace the WhatsApp OTP flow for admin sign-in with email-based OTP (magic link / 6-digit code) using Lovable Cloud's built-in auth.

## Changes

### 1. Auth backend
- Use `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` to send a 6-digit code to the admin's email.
- Verify with `supabase.auth.verifyOtp({ email, token, type: 'email' })` to establish the session directly (no synthetic email hack, no magic-link redirect needed).
- Gate access by checking the email against `admin_phones.email` via the existing `is_admin_identifier` RPC before sending the code.

### 2. Admin login UI (`src/pages/AdminLogin.tsx` + `AdminAuthContext.tsx`)
- Replace "Phone + WhatsApp OTP" tab with "Email OTP" tab (keep Email+Password as fallback).
- Step 1: enter email → call `is_admin_identifier` → if allowed, send OTP.
- Step 2: enter 6-digit code → `verifyOtp` → session established → redirect to `/admin`.

### 3. Email delivery
- Lovable Cloud sends the OTP using the default Lovable sender automatically — no domain setup required for it to work.
- Optional (not in this plan unless requested): custom-branded sender domain + templates.

### 4. Cleanup
- Keep `admin-phone-otp` and WhatsApp secrets in place (still used elsewhere / can be removed later). No destructive changes to WhatsApp infra.
- Raise `rate_limit_email_sent` if the default hourly cap is too low for admin usage.

## Out of scope
- Patient portal OTP (stays on WhatsApp).
- Custom email templates / branded sender domain.

## Confirm
Should I keep the Email+Password option as a secondary tab, or remove it and make Email OTP the only admin login method?
