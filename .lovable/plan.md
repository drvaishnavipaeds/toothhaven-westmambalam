# Admin portal: CBCT viewer, treatment details viewer, patient registration

Three additions to the admin portal, all inside the existing Patients module.

## 1. CBCT / imaging viewer

Today the admin patient page lists uploaded investigations as small thumbnail tiles that cannot be opened. Only the patient portal has a real viewer.

- Clicking any investigation tile opens a full viewer dialog.
- CBCT and DICOM files open in the interactive slice viewer already used in the patient portal: slice scrubbing, scroll-to-navigate, brightness/contrast (window/level) controls, and reset.
- Images, videos and PDFs open in an appropriate large preview with an open/download link.
- Viewer header shows type, procedure category, tooth number, date taken, description, and whether the item is shared with the patient.
- Staff-only extras next to the existing delete action: toggle "visible to patient" directly from the viewer, and step to the previous/next investigation without closing it.

## 2. Patient treatment details viewer

The patient page currently shows a flat list of treatments. It becomes a proper clinical summary.

- Header strip with counts and totals: treatments completed, in progress, planned, total billed value.
- Filter treatments by status and search by name or tooth.
- Each treatment expands to show full details — description, tooth, date, cost, notes — plus inline edit of status, cost and notes, and delete.
- Linked context in the same view: treatment plans, prescriptions and invoices for that patient, each summarised with status and amount.
- Print-friendly treatment summary for the patient.

## 3. Register a new patient from the admin portal

A basic Add Patient dialog exists but captures only a few fields and allows duplicates.

- Expanded registration form: name, phone, email, date of birth, gender, address, medical history, notes, and branch.
- Duplicate protection: warns when the phone or email already belongs to an existing patient and offers to open that record instead.
- Field validation with clear messages: name length, 10-digit phone, valid email format.
- After saving, the new patient's detail page opens so charting, treatments and imaging can be added immediately.
- A "Register patient" action is also available from the patient detail area's back navigation, so reception can add several patients in a row.

## Technical notes

- Reuse the existing DICOM viewer component; load it lazily so the admin dashboard bundle and boot behaviour are unchanged.
- All investigation files stay in the private patient media bucket and are opened through short-lived signed URLs, as they are today.
- No database schema changes are needed. Registration writes to the existing patients table, using the branch column already present.
- Treatment editing and deletion use the existing staff-scoped access rules; no policy changes.
