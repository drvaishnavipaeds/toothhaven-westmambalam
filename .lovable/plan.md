# Tooth Haven mobile Admin PWA

## Outcome
Upgrade the existing authenticated Admin Portal into an installable, mobile-first “Tooth Haven Admin” experience while retaining its desktop layout and all existing clinical, payment, WhatsApp, patient, and appointment workflows.

## Changes
- Add an app manifest, install icons, theme metadata, and a small service worker for the installable PWA shell without caching confidential patient data or API responses.
- Replace the full mobile sidebar with a compact app header, bottom navigation for the most-used areas, and a slide-out menu for every existing admin section; preserve the current desktop sidebar.
- Upgrade the dashboard with today-focused metrics, new-patient and payment summaries, prominent shortcuts, and today’s appointment queue.
- Improve appointment cards and dialogs for phone use: larger actions, patient details, calendar state, explicit cancellation-reason dialog, and responsive Confirm/Reschedule/Cancel controls.
- Reuse the existing secure staff session, staff-only access rules, appointment workflow function, Google Calendar connector, WhatsApp notification ledger, and five-minute lifecycle worker.

## Verification
- Check the existing patient booking still requests real date/time availability and fails closed if Google Calendar is unavailable.
- Verify appointment confirmation, rescheduling, cancellation, tentative expiry, and exactly two reminders remain routed through the existing backend workflow.
- Inspect the live lifecycle schedule and Google Calendar connection status.
- Run TypeScript and production build checks, then verify desktop and Android-sized admin screens and PWA install metadata.

## External dependency
Meta must approve any still-pending tentative, expiry, alternatives, and two-hour reminder templates before those messages can be delivered outside an active WhatsApp conversation window.
