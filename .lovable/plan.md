# Fix patient OTP non-2xx failure

## Goal
Keep the patient portal usable when WhatsApp cannot send an OTP, without exposing a generic edge-function error or consuming the OTP rate limit.

## Changes
1. Treat a missing WhatsApp template as a handled service state rather than an unhandled 4xx/5xx response.
2. Return a structured response that tells the portal the WhatsApp channel is unavailable and recommends Email OTP.
3. Update the patient portal to show a clear bilingual message and switch the user to Email OTP when an email address is available.
4. Keep real infrastructure failures as server errors, while ensuring no OTP record is stored unless WhatsApp confirms delivery.
5. Verify invalid requests, unavailable-template responses, and successful Email OTP navigation in the preview.

## Technical details
- Preserve approved-template discovery using the configured WhatsApp Business account.
- Use a successful transport response with `ok: false`, `channel_unavailable: "whatsapp"`, and a safe user-facing message for Meta error `#132001`.
- Update both patient sign-in and self-registration handlers to consume this structured result instead of relying on the edge SDK's generic non-2xx error.
- The WhatsApp path will send successfully only after an authentication template is approved in Meta; Email OTP remains the operational fallback until then.
