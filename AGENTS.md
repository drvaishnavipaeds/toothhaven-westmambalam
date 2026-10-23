# Project decisions
- Both staff appointment entry screens share the patient directory selector and paginated directory loader; patient linkage uses UUIDs and duplicate matching uses name plus normalized phone, never shared phone alone.
- Patient registration dates are separate from import timestamps, and database-generated clinic codes identify records without exposing contact numbers.

- Staff access changes use the owner-validated staff-management function and atomic service-only assignment RPC; user_roles is authoritative, linked inactive staff lose access, and record mutation audits store identifiers/changed fields rather than private clinical content.

- Public website and chat booking reuse verified patient sessions; appointment writes and availability checks stay in the appointment workflow, because anonymous inserts cannot safely confirm calendar availability or expose appointment records.
- Compressed DICOM decoding stays in a lazy-loaded, client-side viewer with explicit transfer-syntax allowlisting, because private signed scans must not leave the existing patient-media workflow.
- Email and WhatsApp patient sign-ins issue the same server-verified portal session; private patient records and media are resolved by the appointment workflow from that identity, never a client-supplied patient ID, to preserve staff-only table and storage access.
- WhatsApp booking uses a server-only deterministic conversation state with existing OTP verification and appointment workflow calls; booking codes never go to the language model, and signed Meta callbacks are required before processing sender identity.
- Doctor notification links open only authenticated admin review, never approve via GET; alert delivery/error tracking reuses the appointment notification ledger.
- Notification senders atomically claim each ledger event before external sends, because concurrent reviews must not send duplicate billed messages.
- Failed doctor alerts retry through the existing five-minute lifecycle worker with bounded attempts; sent or ambiguous in-flight sends are never reclaimed automatically, to prevent duplicate billed messages.
- WhatsApp verification codes are redacted from stored inbox payloads and excluded from AI history; general chat does not resolve private records by sender digits.
- Calendar availability rejects missing, malformed, or per-calendar error responses rather than interpreting them as empty busy periods, so connection failures cannot create false availability.
- Both prescription screens share catalogue-backed medicine selection and explicit new-medicine persistence through the existing staff-protected catalogue; patient regimens never become shared defaults.- The offline app shell uses vite-plugin-pwa generateSW registered only through src/lib/register-sw.ts, because service workers must never run in dev, preview, or iframes.

- Closed-app staff alerts use standard Web Push (VAPID) via public/push-sw.js imported into the generated service worker; subscriptions are per staff device and sends go through supabase/functions/_shared/web-push.ts, never Firebase.
