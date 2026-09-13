# Connect all appointment WhatsApp events

## Outcome
Patients receive reliable WhatsApp updates for appointment requests, confirmations, rescheduling, cancellations, and scheduled reminders. Staff can see whether each notification was sent, delivered, read, or failed.

## Meta setup required
Create and submit these **Utility** templates in WhatsApp Manager, using English (`en`) and the exact variable order shown:

- `th_appointment_request`: patient name, date, time, service
- `th_appointment_confirmation`: patient name, date, time, service
- `th_appointment_rescheduled`: patient name, old date/time, new date/time, service
- `th_appointment_cancelled`: patient name, date, time, reason
- Keep the approved `th_appointment_reminder`: patient name, date, time

The app will use only templates that Meta reports as approved. The existing webhook and `messages` subscription will continue receiving inbound replies plus sent/delivered/read/failed updates; no separate webhook is needed.

## App changes
- Replace the disconnected appointment notification functions with one secured appointment-event sender that reads appointment details from the database, validates staff or trusted scheduled calls, selects the approved template, and logs Meta’s message ID.
- Send a request acknowledgement after a website booking, a confirmation when staff confirms, a reschedule notice when date/time changes, and a cancellation notice with a staff-entered reason.
- Update both appointment screens so creating, confirming, rescheduling, and cancelling use the same reliable flow and visibly report notification success or failure.
- Add automatic reminders for confirmed appointments approximately 24 hours before their scheduled time, with idempotency so retries never send duplicates.
- Continue suppressing promotional messages for opted-out patients while allowing necessary transactional appointment updates.

## Tracking and safety
- Add an appointment-notification ledger containing event type, template, Meta message ID, status, error, and timestamps; restrict it to authorized clinic staff.
- Make every event idempotent, validate appointment IDs and status transitions, normalize phone numbers, and never trust patient details supplied by the browser.
- Feed webhook delivery updates into the ledger and existing WhatsApp inbox history.
- Keep appointment messages transactional; promotions remain in the separate campaign workflow.

## Verification
- Confirm all required templates are discoverable and approved.
- Test request, confirmation, reschedule, cancellation, and 24-hour reminder against a controlled appointment for `9585996484`.
- Verify database records and Meta webhook transitions through sent, delivered, and read where available, without exposing OTPs or secret values.
- Run type/build checks and exercise the admin appointment controls on mobile and desktop.

## Technical notes
- A scheduled callback will scan a narrow reminder window rather than relying on a browser being open.
- Existing Meta credentials, app-secret proof, phone-number ID, business-account ID, and webhook verification will be reused.
- Confirmation, reschedule, and cancellation sending becomes active after Meta approves their templates; the app will show a clear configuration error instead of silently falling back to disallowed free text.
