## Goal
Expand the existing Admin Dashboard so its sidebar and functionality mirror the SmartDentalDesk-style clinic management suite shown in the screenshot.

## Current admin tabs (already built)
Dashboard (Overview), Patients, Appointments, Financials, Content, Case Studies, Testimonials, Achievements, Consents.

## New tabs to add (mapped to screenshot)
1. **Treatments** — treatment catalog (name, category, default price, duration) + per-patient treatment records with tooth chart notes.
2. **Prescriptions** — create/print Rx per patient (drug, dose, frequency, duration, notes); PDF export.
3. **Invoices** — generate invoice from treatments/appointments, tax, discount, status (paid/partial/unpaid), printable PDF.
4. **Memberships** — membership plans (name, price, validity, included services) + assign to patients with expiry tracking.
5. **Expenses** — clinic expense log (date, category, vendor, amount, payment mode, receipt upload).
6. **Inventory** — stock items (name, category, unit, qty, reorder level, expiry, supplier); low-stock alerts.
7. **Tutorials** — internal knowledge base (video/PDF/links) for staff training, categorized.
8. **Reports** — filterable reports: revenue, appointments, treatments count, top procedures, expenses, doctor-wise; CSV/PDF export.
9. **Staff** — staff directory (name, role, phone, email, join date, status) + role assignment linked to `user_roles`.
10. **Branches** — multi-branch setup (name, address, phone, in-charge doctor); patients/appointments taggable by branch. West Mambalam seeded as default.
11. **Audit Logs** — read-only log of admin actions (who did what, when) via a trigger on key tables.
12. **Communication** — outbound message center: bulk SMS/WhatsApp/email templates, campaign history.
13. **WhatsApp Inbox** — placeholder shell (locked icon like screenshot) — requires WhatsApp Business API; UI stub only for now.
14. **Billing** — clinic-level billing/subscription view (own Lovable/Cloud usage or clinic revenue summary — confirm scope).
15. **Settings** — clinic profile, working hours, timings, tax %, invoice numbering, notification preferences, admin phones/emails.

Existing tabs stay, reorganized into sidebar groups:
- **Clinical**: Dashboard, Patients, Appointments, Treatments, Prescriptions
- **Finance**: Invoices, Memberships, Expenses, Billing, Reports
- **Operations**: Inventory, Staff, Branches, Communication, WhatsApp Inbox, Audit Logs, Tutorials
- **Marketing** (existing): Content, Case Studies, Testimonials, Achievements, Consents
- **System**: Settings

## Technical approach
- One migration per module adding tables with RLS + GRANTs (admin-only via `has_role`).
- Each module = one component under `src/components/admin/<Module>Manager.tsx`, wired into `AdminSidebar` and `AdminDashboard`.
- Audit log via generic `audit_logs` table + Postgres triggers on `patients`, `appointments`, `payments`, `invoices`, `prescriptions`.
- Reports read via aggregate SQL views; CSV export client-side.
- PDF (invoice/Rx) using `jspdf` + `jspdf-autotable`.
- Branches: add `branch_id` FK on patients/appointments/staff; default branch seeded.

## Scope questions before I build
1. This is ~12 new modules — should I build **all in one go** (large single delivery, longer wait) or **phased** (Phase A: Treatments, Prescriptions, Invoices, Inventory, Staff, Branches, Settings → Phase B: Memberships, Expenses, Reports, Audit Logs, Communication, Tutorials, WhatsApp Inbox)?
2. **Billing** tab — do you want it to show clinic revenue summary (like a finance snapshot) or subscription/plan for the app itself? Screenshot suggests app-billing, but for a clinic dashboard revenue summary is more useful.
3. **WhatsApp Inbox** — leave as "Coming soon" locked UI, or wire to CallMeBot for outbound-only? Full two-way inbox needs paid WhatsApp Business API.
4. **Multi-branch** — you mentioned West Mambalam is your branch and another doctor runs a second one. Should the second branch be added too (read-only), or only West Mambalam for now?
