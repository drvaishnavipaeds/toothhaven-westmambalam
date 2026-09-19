# Admin treatment selectors and realistic dental chart

## What will change

- Create one reusable treatment dropdown backed by the existing active treatment catalog, including its stored price and tax details where billing needs them.
- Create one reusable FDI tooth dropdown covering adult teeth 11–48 and primary teeth 51–85, grouped by arch and with a whole-mouth / not-tooth-specific choice.
- Use these selectors when adding treatments, treatment-plan procedures, invoice items, investigations, and prescription/advice context. Existing free-text clinical notes and custom invoice items remain available.
- Add treatment and tooth context to prescriptions so the selected procedure and tooth are saved with the prescription and shown in its list and print view.
- Replace the dental chart’s generic tooth glyphs with detailed tooth-specific vector illustrations for incisors, canines, premolars, and molars, while retaining FDI layout, clickable teeth, condition colours, surfaces, history, and adult/pediatric switching.

## Technical details

- Reuse `treatment_catalog` as the single source of treatment choices rather than creating a duplicate treatment list.
- Add nullable prescription fields for treatment and tooth through a database migration, preserving all existing prescriptions.
- Keep illustrations as local vector UI, not as generic imagery or a copy of the uploaded screenshot.
- Verify form behavior, chart interaction, narrow-screen layout, build health, and database access rules.