
## Goal

Re-enable phone OTP on the Admin Login by reusing the same WhatsApp Cloud API sender that powers the patient portal, and turn a successful OTP into a real Supabase auth session so `AdminAuthContext` continues to work unchanged in shape.

## Why the current setup fails

`AdminAuthContext.signInWithPhone` calls `supabase.auth.signInWithOtp({ phone })`, which requires Supabase's native SMS provider — not configured on this project, hence "unsupported phone provider". The patient portal (`portal-otp`) already sends OTPs over WhatsApp but issues its own bearer token, not a Supabase session, so it can't be reused as-is for admin auth (admin gating relies on `supabase.auth` user).

## Approach

Introduce a new edge function `admin-phone-otp` that:

1. **send**: authorizes the phone via `is_admin_identifier` (service role), rate-limits, stores a hashed OTP in `portal_otp_codes`, and sends it via WhatsApp using the same template/helper as `portal-otp`.
2. **verify**: validates the OTP, then upgrades the admin to a real Supabase auth session by:
   - Using a synthetic internal email per admin: `admin+<10digit>@toothhaven.internal`.
   - Ensuring the auth user exists via `supabase.auth.admin` (create if missing) with `user_metadata.admin_phone = <10digit>` and `email_confirm: true`.
   - Calling `supabase.auth.admin.generateLink({ type: 'magiclink', email })` and returning the resulting `hashed_token` to the client.
3. Client calls `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` to hydrate a real session — no password exposure, no reliance on Supabase SMS.

## Client changes

- `src/contexts/AdminAuthContext.tsx`
  - `signInWithPhone(phone)` → invoke `admin-phone-otp` with `action: 'send'`.
  - `verifyOtp(phone, token)` → invoke `admin-phone-otp` with `action: 'verify'`, then `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`.
  - `checkAdmin`: if the signed-in user has `user_metadata.admin_phone`, pass that phone to `check-admin`; otherwise fall back to `user.email` (unchanged path for email/password admins).
- `src/pages/AdminLogin.tsx`
  - Restore the Phone OTP option in the `choose` step, remove the "temporarily unavailable" notice, keep email/password as the alternative.

## Reused pieces (no duplication)

- WhatsApp send helper, template envs, and rate-limit pattern are duplicated (small) into `admin-phone-otp` to keep functions self-contained. The `portal_otp_codes` table is reused; admin rows are distinguished by phone being an admin — no schema change needed.

## Security considerations

- `admin-phone-otp` runs with service role but only ever issues a magic-link token for phones that pass `is_admin_identifier` at both send and verify time.
- Synthetic emails are on a non-routable domain (`toothhaven.internal`) so they can never receive external mail; the magic link is consumed server-to-client in the same response and never emailed.
- OTPs remain 6-digit, 5-min TTL, 3-per-15-min rate limit — same as patient portal.
- No new client-visible secrets; no new SUPABASE dashboard steps.

## Verification

1. Deploy `admin-phone-otp`.
2. From Admin Login, request OTP for +91 8925166149 / 9884166149 / 9585996484 → WhatsApp arrives.
3. Enter code → land on `/admin/dashboard` with `isAdmin === true`.
4. Confirm an unauthorized phone gets "not authorized" before any OTP is sent.
5. Confirm existing email/password login for `karthiktoothhaven25@gmail.com` and `kartz19@gmail.com` still works.

## Out of scope

- Changing the patient portal OTP flow.
- Adding admin phone/email management UI.
