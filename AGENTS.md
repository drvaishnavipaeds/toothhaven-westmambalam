# Project decisions

- Public website booking enters the existing verified patient portal; appointment writes and availability checks stay in the appointment workflow, because anonymous inserts cannot safely confirm calendar availability or expose appointment records.
- Compressed DICOM decoding stays in a lazy-loaded, client-side viewer with explicit transfer-syntax allowlisting, because private signed scans must not leave the existing patient-media workflow.
- Email and WhatsApp patient sign-ins issue the same server-verified portal session; private patient records and media are resolved by the appointment workflow from that identity, never a client-supplied patient ID, to preserve staff-only table and storage access.