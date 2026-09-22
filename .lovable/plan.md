# Finish remaining dependency security work

## Outcome
Remove the legacy DICOM loader dependency that cannot receive the required UUID security fix, while preserving patient and admin DICOM viewing.

## Changes
- Replace the legacy Cornerstone 2 WADO loader with the maintained Cornerstone 3D packages.
- Adapt the existing DICOM viewer to the new rendering engine and keep frame navigation, window/level controls, loading, and error states.
- Remove obsolete Cornerstone dependencies and regenerate the text lockfile so vulnerable transitive packages disappear.
- Re-run the dependency scan, type checks, production build, and focused DICOM viewer checks.

## Technical details
- Keep signed investigation URLs and current patient/admin access unchanged.
- Do not change appointment, calendar, WhatsApp, billing, or authentication workflows.
- The MCP/esbuild path will be verified from the resolved lockfile; no forced transitive override will be added.
