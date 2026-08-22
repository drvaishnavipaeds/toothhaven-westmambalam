# Smart Dental Desk-style upgrade for Tooth Haven

Explored smartdentaldesk.com. It is an India-focused dental practice management platform built around six modules: appointment scheduling, dental charting + EMR, GST billing, WhatsApp communication, an AI clinical copilot, and multi-branch management.

## Where you already stand

Your admin portal already covers a large share of it: patients, appointments, treatment catalog, prescriptions, invoices, expenses, inventory, memberships, staff, branches, campaigns, audit logs, reports, content approval workflow, plus a patient portal, WhatsApp/email OTP and the Haven AI chatbot.

Confirmed gaps against Smart Dental Desk (from the current database schema):

- No tooth-level dental chart — `treatments` only stores a free-text `tooth_number`.
- No treatment plans (phased, quoted, patient-accepted).
- No GST split — `invoices` has a single flat `tax` column, no CGST/SGST, no GSTIN, no HSN/SAC.
- No doctor or chair assignment on `appointments`, no waitlist, no recall scheduling.
- No role separation — access is a single staff/not-staff check; there is no roles table, so a receptionist sees the same clinical data a dentist does.
- Campaigns are stored but never actually sent; no two-way WhatsApp inbox.
- No AI clinical documentation (SOAP notes, prescription suggestions) in the admin portal.

## Build plan

### Phase 1 — Clinical core (the biggest differentiators)

**Interactive dental chart.** FDI-numbered adult + pediatric charts, per-tooth and per-surface (M/O/D/B/L) status: healthy, caries, filled, crown, bridge, implant, missing, RCT. Click a tooth to log findings or add a planned procedure. Colour-coded SVG odontogram, chart history per visit.

**Treatment plans.** Group procedures into phases with per-item cost, discount and estimated sittings. Generate a printable/WhatsApp-shareable quote, track patient acceptance, and convert accepted items straight into appointments and invoice lines.

**Role-based access.** Proper roles table (owner, dentist, receptionist, assistant) with a security-definer role check. Receptionists get scheduling and billing; clinical notes, charts and prescriptions stay with clinical roles.

### Phase 2 — Scheduling and revenue

**Calendar view.** Day/week calendar with doctor-wise and chair-wise columns, drag to reschedule, colour-coded status, no-show marking and a per-doctor no-show rate.

**Waitlist and recalls.** Waitlist for cancellations; automatic recall dates (6-month cleaning, post-implant review) with a due-recall worklist.

**GST-compliant billing.** Clinic GSTIN, per-item HSN/SAC and tax rate, exempt healthcare vs taxable cosmetic handling, CGST/SGST/IGST split on the invoice, GSTR-1 CSV export, and payment/EMI installment tracking against each invoice.

### Phase 3 — AI copilot and communication

**AI clinical copilot** (Lovable AI Gateway, Gemini): brief note or dictation in, full dental SOAP note out; prescription suggestions with dosage/frequency/duration; treatment suggestions from the chart; everything staff-reviewed before saving. Bilingual prescription printing (English/Tamil).

**WhatsApp engagement.** Actually send campaigns and reminders through your existing Cloud API setup: appointment confirmation, 24h reminder, post-op follow-up, recall nudges, birthday wishes. Two-way inbox reading inbound messages via the existing `whatsapp-webhook`. Delivery logging per message.

### Phase 4 — Beyond Smart Dental Desk (newer features)

- **Lab work tracking** — crown/aligner cases sent to labs, due dates, status, per-case cost.
- **Queue / token display** — a waiting-room screen showing now-serving and next tokens.
- **AI no-show risk score** — flags high-risk appointments so reception can double-confirm.
- **Digital consent e-signature** — sign on tablet, stored against the existing `patient_consents`.
- **Teleconsultation slots** — video-consult appointment type with a join link sent over WhatsApp.
- **Owner analytics** — chair utilisation, doctor productivity, treatment-acceptance rate, revenue per patient.

## Technical notes

- New tables: `user_roles` + `app_role` enum, `dental_chart_entries`, `treatment_plans`, `treatment_plan_items`, `appointment_recalls`, `waitlist`, `lab_cases`, `clinical_notes`, `whatsapp_messages`. Columns added to `appointments` (doctor_id, chair, is_no_show), `invoices` (gstin, cgst, sgst, igst, place_of_supply), `invoice_items` (hsn_sac, tax_rate).
- Every new public table gets GRANTs, RLS enabled, and policies scoped through the roles function.
- AI runs server-side in an edge function via the Lovable AI Gateway — no clinical text goes to the browser-side model.
- New admin tabs slot into the existing `AdminSidebar` groups; charting and plans render inside `PatientDetail`.

## Suggested order

Phase 1 first — the dental chart and treatment plans are what make it a real dental PMS rather than a generic clinic app. Approve this plan and I will start with Phase 1, or tell me to reorder.
