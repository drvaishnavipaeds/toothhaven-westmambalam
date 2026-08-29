# Plan: Branded Auth Emails + Per-Patient Clinical Workflow

## 1. Auth email templates (branding + deploy)

Templates and the hook are already scaffolded; four of them still use default black/white styling.

- Apply Tooth Haven branding to `signup.tsx`, `invite.tsx`, `recovery.tsx`, `email-change.tsx`, `reauthentication.tsx` (magic-link already branded):
  - Button/heading teal `hsl(174,50%,50%)` / dark teal `hsl(174,55%,38%)`, white button text, `0.75rem` radius, muted text `hsl(200,10%,45%)`, Poppins-with-fallback font stack.
  - Copy matched to the app's voice ("Tooth Haven — Advanced Dental Care").
- Deploy the `auth-email-hook` edge function.
- Emails activate once DNS for `notify.toothhaven.in` verifies; monitor in Cloud → Emails. Default emails keep sending until then.

## 2. Build verification

- `/tmp/observability/build-errors.log` already shows **build OK** for the new `AdminInvestigations` and `TreatmentDetails` components.
- After the changes below, run a fresh build check and fix any compile/type issues.

## 3. Per-patient clinical workflow (click patient name → full visit flow)

Restructure `PatientDetail.tsx` from one long scroll into a tabbed workspace so each patient record contains the full visit flow:

```text
Patient: Anitha R.            [+ Register patient]
[Overview] [Tooth Chart] [Prescription] [Investigations] [Plan & Billing]
```

- **Overview tab** — existing demographics card, plus quick stats (appointments, outstanding balance).
- **Tooth Chart tab** — existing `DentalChart`, extended so each tooth entry captures a **chief complaint** field (tooth-specific complaints, condition, surfaces, notes).
- **Prescription tab** — new per-patient prescription form (reuses `prescriptions` table with `patient_id` pre-filled): diagnosis, drug list, bilingual instructions, saved prescription history. Optional "draft with AI" via existing clinical-copilot.
- **Investigations tab** — existing `AdminInvestigations` (upload + CBCT/DICOM viewer), unchanged.
- **Plan & Billing tab** — existing `TreatmentPlans` and `TreatmentDetails`, plus a **Generate Bill** action: pick accepted/completed treatment plan items → create an invoice (with GST fields) pre-filled for this patient, reusing the logic in `InvoicesManager`, then mark items as billed.

## Technical details

- No new tables needed: `dental_chart_entries.notes` covers complaints (add dedicated `complaint` UI on top), `prescriptions`, `invoices`, `invoice_items`, `treatment_plans`, `treatment_plan_items` already exist with staff RLS.
- New files: `src/components/admin/PatientPrescriptions.tsx`, `src/components/admin/PlanBilling.tsx` (invoice generation dialog). Edits: `PatientDetail.tsx` (tabs), `DentalChart.tsx` (complaint field).
- Email template edits stay inside `supabase/functions/_shared/email-templates/`.
