# Project decisions

- Public website and chat booking reuse verified patient sessions; appointment writes and availability checks stay in the appointment workflow, because anonymous inserts cannot safely confirm calendar availability or expose appointment records.
- Compressed DICOM decoding stays in a lazy-loaded, client-side viewer with explicit transfer-syntax allowlisting, because private signed scans must not leave the existing patient-media workflow.
- Email and WhatsApp patient sign-ins issue the same server-verified portal session; private patient records and media are resolved by the appointment workflow from that identity, never a client-supplied patient ID, to preserve staff-only table and storage access.
- WhatsApp booking uses a server-only deterministic conversation state with existing OTP verification and appointment workflow calls; booking codes never go to the language model, and signed Meta callbacks are required before processing sender identity.
- Doctor notification links open only authenticated admin review, never approve via GET; alert delivery/error tracking reuses the appointment notification ledger.
- Calendar availability rejects missing, malformed, or per-calendar error responses rather than interpreting them as empty busy periods, so connection failures cannot create false availability.