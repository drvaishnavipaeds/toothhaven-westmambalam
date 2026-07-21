## Goal
Verify the admin WhatsApp OTP login end-to-end and identify any remaining blockers.

## Checks

1. **Config sanity (backend)**
   - Confirm `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` are set and the token is a System User permanent token.
   - Confirm the sender number shows "Registered / Connected" in WhatsApp Manager (fixes prior `#133010`).
   - Confirm `otp_verification` template is **Approved** in the configured language.

2. **Send step (`admin-phone-otp` action=send)**
   - Invoke with an authorized number (e.g. `+919884166149`).
   - Expect: `200 { ok: true }`, a row in `portal_otp_codes`, and a WhatsApp message delivered.
   - Inspect edge function logs for Graph API response.

3. **Rate-limit + authorization guards**
   - Unauthorized number → `403`.
   - 4th send within 15 min → `429`.

4. **Verify step (`admin-phone-otp` action=verify)**
   - Submit the received 6-digit code.
   - Expect: `200 { ok:true, token_hash, email: admin+<phone>@toothhaven.internal }`.
   - Confirm the OTP row is marked `consumed_at`.

5. **Session exchange (client)**
   - `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })` returns a session.
   - `AdminAuthContext` sets `isAdmin=true` via `check-admin` using `user_metadata.admin_phone`.
   - `AdminLogin` redirects to `/admin/dashboard`.

6. **Negative paths**
   - Wrong OTP → `401 Invalid or expired code`, `attempts` increments.
   - Expired OTP (>5 min) → `401`.
   - Reused OTP → `401` (consumed).

## Deliverable
A short pass/fail report per step with the offending log line / DB row for any failure, and a targeted fix (code or Meta-side) only if a failure is found. No code changes proposed up front.

## Technical notes
- Tools used (read-only): `supabase--edge_function_logs` for `admin-phone-otp` and `check-admin`, `supabase--read_query` on `portal_otp_codes` and `admin_phones`, `supabase--curl_edge_functions` for send/verify, and a Playwright run against `/admin/login` to exercise the UI.
- No schema, RLS, or function-code edits unless a specific failure requires one; any fix will be scoped and listed before applying.

## Question
Which authorized phone number should I use for the live send/verify test, and are you available to read the OTP off WhatsApp and paste it back so I can complete the verify step?
