# Google Calendar appointment booking and reminders

## Outcome
Patients choose an available appointment time from Dr. Karthik’s clinic calendar. Staff receive the request on WhatsApp and have 10 minutes to confirm it. If staff do not act, the system tentatively reserves the selected time for 24 hours and informs the patient. Confirmed patients receive exactly two reminders: one day before and two hours before.

## Patient booking experience
- Replace the fixed 11:00 booking time with selectable free slots.
- Offer slots Monday–Saturday during 11:00–14:00 and 18:00–21:00, using the treatment duration and 30-minute increments.
- Exclude times already occupied in Dr. Karthik’s Google Calendar, confirmed clinic appointments, and active pending/tentative holds.
- Do not offer Sunday online booking. Show a concise emergency note with the clinic’s phone/WhatsApp contact for case-by-case Sunday consideration.
- Recheck availability at submission so two patients cannot take the same slot. If it has become unavailable, show the nearest available alternatives.

## Request, approval, and tentative hold
1. A submitted request creates a short internal hold and remains pending.
2. Send the admin a WhatsApp request containing patient, treatment, date, time, and a clear instruction to confirm or decline in the admin appointment screen.
3. If staff confirms within 10 minutes, create/update the Google Calendar event, mark the appointment confirmed, notify the patient, and cancel the fallback.
4. If staff has not acted after 10 minutes, recheck Google Calendar:
   - If still free, create a clearly labelled tentative Google Calendar event, retain it for 24 hours, and send the patient a “tentatively fixed, awaiting clinic confirmation” message.
   - If no longer free, keep the request pending, send the patient the nearest available alternatives, and alert staff.
5. Staff confirmation converts the tentative event to confirmed. Cancellation or rescheduling updates both the clinic record and Google Calendar.
6. If a tentative hold reaches 24 hours without staff action, release it, mark the request as needing follow-up, and notify both patient and staff rather than silently confirming it.

## Google Calendar connection
- Connect the clinic-owned Google Calendar account for `karthiktoothhaven25@gmail.com` through the Google Calendar app connector; patients will not connect their own accounts.
- Read busy periods from the selected calendar and create/update/delete clinic appointment events securely from backend functions.
- Store the Google event reference and synchronization state with each appointment so retries are idempotent and never create duplicate events.
- Treat the clinic database as the workflow record and Google Calendar as the availability/event calendar; reconcile conflicts before every hold, confirmation, or reschedule.

## Reminder behavior
- Remove the existing single 24-hour-only reminder behavior and support two deduplicated events: 24 hours before and 2 hours before.
- Send reminders only for confirmed appointments, never for pending, expired, cancelled, or merely tentative requests.
- Use approved WhatsApp utility templates and record sent, delivered, read, and failed states in the existing notification ledger.
- No hourly reminder messages will be sent. A background due-time check is still required for the 10-minute fallback and reminders; use a five-minute check (288 lightweight checks/day, maximum five-minute timing variation) rather than an hourly check.

## Admin controls
- Show pending, tentative, confirmed, expired, and conflict states clearly in the appointment screens.
- Keep the existing staff Confirm, Reschedule, and Cancel actions, but synchronize each action with Google Calendar before reporting success.
- Surface WhatsApp and calendar failures visibly so staff can retry safely without duplicate messages or events.

## Data and safety
- Add appointment fields for hold expiry, confirmation deadline, Google event ID, calendar sync state, and tentative/expiry timestamps.
- Add server-side overlap protection for active clinic appointments and holds; never rely only on what the patient’s browser displayed.
- Restrict calendar access and lifecycle processing to trusted backend functions and authorized clinic staff.
- Make the 10-minute fallback, 24-hour expiry, reminders, and Google event writes idempotent.

## Verification
- Connect and verify the specified Google account and calendar permissions.
- Test free-slot display inside both clinic sessions, Sunday exclusion, stale-slot alternatives, and simultaneous booking protection.
- Test staff confirmation before 10 minutes, automatic tentative reservation after 10 minutes, 24-hour release, reschedule, and cancellation.
- Test exactly one 24-hour reminder and one 2-hour reminder, including retry and webhook delivery updates.
- Verify Google Calendar and the admin appointment screens stay consistent on mobile and desktop, then run type/build checks.

## Setup dependency
The Google Calendar connection requires the owner of `karthiktoothhaven25@gmail.com` to complete a one-time Google authorization during implementation. New tentative, alternative-slot, 24-hour, and 2-hour WhatsApp templates must also be approved by Meta before those messages can be sent outside the 24-hour conversation window.
