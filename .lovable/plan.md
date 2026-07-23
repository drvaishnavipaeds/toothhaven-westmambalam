## Goal
Replace the current WhatsApp Cloud API sender configuration with the new details you provided:
- WhatsApp Business Account ID: `1557345732385350`
- Sender phone: `+91 87542 56417`  
- Phone Number ID: `1132563273283167`

## Current state
- `WHATSAPP_PHONE_NUMBER_ID` is already configured as a project secret.
- `WHATSAPP_ACCESS_TOKEN` and `META_WEBHOOK_VERIFY_TOKEN` are already configured.
- `WHATSAPP_BUSINESS_ACCOUNT_ID` is **not** currently stored as a secret.

## Plan

1. **Update `WHATSAPP_PHONE_NUMBER_ID`**  
   Set it to `1132563273283167` so the Graph API messages endpoint points to the new registered sender.

2. **Add `WHATSAPP_BUSINESS_ACCOUNT_ID`**  
   Store `1557345732385350` as a new secret. This is required for webhook verification and for API calls scoped to the WABA (e.g., template management, message templates).

3. **Confirm `WHATSAPP_ACCESS_TOKEN` permissions**  
   The existing token must belong to (or have permission on) the new WABA `1557345732385350` and the new Phone Number ID. If the token was created for the old WABA/number, it will need to be regenerated as a **System User permanent token** with `whatsapp_business_messaging` and `whatsapp_business_management` permissions. You will be asked to confirm before updating it.

4. **Keep `META_WEBHOOK_VERIFY_TOKEN` unchanged**  
   The webhook endpoint is already deployed at `https://zymakgyfirjecxbdvtzg.supabase.co/functions/v1/whatsapp-webhook`. No URL change is needed; the token value stays the same unless you want to rotate it.

5. **Meta-side verification (not code)**  
   Before the admin OTP will send successfully, confirm in Meta Business / WhatsApp Manager that:
   - The new number `+91 87542 56417` is **Registered / Connected** for Cloud API.
   - The `otp_verification` template is **Approved** in language `en` (or update `WHATSAPP_TEMPLATE_LANG` if you use a different approved language).

6. **Post-change test**  
   After the secrets are updated, run a send test via the admin login page and inspect the `admin-phone-otp` edge-function logs to confirm the WhatsApp message is accepted by Graph API.

## Notes
- The new sender number is not automatically added as an admin login number. If you also want `+91 87542 56417` to log into the admin portal, that requires a separate update to `admin_phones`.
- The 10-digit login format used internally will be `8754256417` with country code `91` (the existing `DEFAULT_COUNTRY_CODE` default).

## Question
Do you have a **new Meta System User permanent access token** for this WABA, or should I keep the existing `WHATSAPP_ACCESS_TOKEN`? If the token was created under the old WABA/number, it will likely fail after the Phone Number ID is changed.