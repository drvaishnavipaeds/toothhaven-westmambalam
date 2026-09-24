# Premium clinical, imaging, and mobile admin upgrade

## Clinical workflow
- Add staff-secured medicine and reusable clinical-template libraries, then use them in patient prescriptions and advice while preserving free-text overrides.
- Add patient voice notes with private audio storage, transcription-ready records, and clinical summaries in the existing patient workspace.
- Extend patient consent into a treatment-linked digital signing flow using the existing consent records and private media storage.
- Upgrade treatment plans into printable estimates with validity and GST totals.
- Add a private before/progress/after patient timeline linked to treatments and teeth.

## Advanced imaging
- Extend the existing investigation viewer with touch-friendly zoom, pan, reset, calibrated measurements, notes/markers, and tooth-linked annotations.
- Support multi-file investigation series and side-by-side image comparison using private signed media links.
- Add compressed DICOM decoding only through a maintained, lockfile-audited browser codec path; retain the current secure renderer for uncompressed studies and fail clearly for unsupported formats.

## Premium mobile admin
- Add global patient search across admin screens with direct patient opening.
- Add mobile quick actions for patient registration and appointments without duplicating existing forms.
- Add one-tap call and WhatsApp actions in patient and appointment views.
- Add inactivity locking with device-authentication support when available and secure password re-entry fallback.
- Add live badges for pending appointments and unread patient messages.

## Data and security
- Apply one migration with explicit grants, staff-only row access, private patient-media usage, and no changes to existing appointment, WhatsApp, payment, or patient access rules.
- Preserve all existing records and workflows.

## Verification
- Verify clinical forms, imaging tools, search, quick actions, lock/re-entry, badges, and phone/desktop layouts.
- Run focused tests, type checks, production build, database policy checks, and dependency scan for any imaging package added.
