# Verify and complete CBCT imaging

## Scope
- Keep the existing patient investigation upload and private storage flow.
- Make uploaded DICOM series open as one study with slice navigation.
- Add a true interactive 3D volume view for multi-slice CBCT studies, with a 2D/3D mode switch and mobile-safe limits.
- Preserve the existing JPEG 2000, JPEG lossless, and baseline JPEG decoders; unsupported transfer syntaxes remain blocked.
- Verify a real DICOM upload, viewing controls, and signed-in admin layouts on phone and desktop.

## Technical details
- Resolve signed URLs for every stored series file, not only the selected slice.
- Refactor DICOM parsing/decoding into reusable browser-only helpers.
- Render a downsampled voxel volume with Three.js, lazy-loaded only when 3D mode is opened.
- Test with local DICOM fixtures through the actual upload screen, then check screenshots, console/runtime errors, type checks, and the preview build.
