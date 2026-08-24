# Admin password reset

## Current state

`karthiktoothhaven25@gmail.com` is already authorized as an admin (stored with the phone +91 89251 66149, role admin), so no authorization change is needed. There is currently no forgot-password link and no reset-password page in the app.

## What to build

1. **Forgot password link** on the admin login screen, shown in the Email & Password step.
   - Asks for the admin email, verifies it is an authorized admin (existing admin check), then sends a reset email.
   - Shows a confirmation message ("check your inbox") and a back link.

2. **New `/reset-password` page** (public route)
   - Detects the recovery link session, shows new password + confirm password fields, basic strength/match validation.
   - On success, signs the admin in and redirects to the admin dashboard; on an invalid or expired link, shows a clear message with a link back to admin login.

3. **Cleanup**: remove the temporary password-setting backend function created earlier, since self-service reset replaces it.

## Technical notes

- `resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })` in `AdminAuthContext`, guarded by the existing `check-admin` authorization call so non-admin emails get no reset mail.
- New `src/pages/ResetPassword.tsx` + route in `src/App.tsx`; updates password via `supabase.auth.updateUser({ password })`.
- Reset emails use the already-configured branded auth email templates on notify.toothhaven.in, so no email setup work is required.
- Delete the `tmp-set-admin-password` edge function.
