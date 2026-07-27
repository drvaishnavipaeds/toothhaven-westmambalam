## Goal
Replace the current Tooth Haven logo with the newly uploaded logo image everywhere it appears in the app.

## Steps
1. Upload the new logo (`user-uploads://f39f68b5...png`) to Lovable Assets CDN as `src/assets/tooth-haven-logo.png.asset.json` (replacing the current `src/assets/tooth-haven-logo.png` import target).
2. Remove the old `src/assets/tooth-haven-logo.png` binary from the repo.
3. Update the 4 components that currently `import logo from "@/assets/tooth-haven-logo.png"` to import the new asset pointer JSON and use `logo.url`:
   - `src/components/Navbar.tsx`
   - `src/components/Footer.tsx`
   - `src/components/HeroSection.tsx`
   - `src/components/ContactSection.tsx`
4. Also update the admin sidebar header (`src/components/admin/AdminSidebar.tsx`) which currently uses a 🦷 emoji + text — swap in the real logo image for brand consistency.
5. Verify the preview renders the new logo across landing page, admin sidebar, and footer.

## Notes
- Social/OG image in `index.html` is a separate hosted image and is NOT being changed (out of scope unless you ask).
- Favicon is not being changed unless requested.
