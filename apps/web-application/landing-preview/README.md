# Responsive Stage landing preview

This is the approved static landing screen at `/landing-preview/`, with its getting-started screen at `/landing-preview/download/`. Vite copies these files from `public/` into the web application build; Cloudflare serves them as static HTML. The existing homepage, React routes, authentication and billing are unchanged. Open the preview URL directly (or use a normal anchor), rather than a client-router link.

## Edit and preview

From `apps/web-application`, run `pnpm landing:build` (Python 3 required) to regenerate the two HTML documents. Copy lives in this directory's JSON files. Authored CSS, JavaScript and licensed media live in `../public/landing-preview/`; edit these assets directly. The generator adds content hashes to stylesheet and script URLs and prefixes page URLs with `/landing-preview/`.

For an independent preview without backend setup:

```sh
python3 landing-preview/build.py
python3 -m http.server 8766 --directory public
```

Open `http://localhost:8766/landing-preview/`. The normal web application's dev/build commands also include the committed screen; Python is only needed when regenerating HTML.

## Handoff

- Mobile navigation is viewport-limited and scrollable. Research and Flows stack copy above their infographics. Export uses scroll-driven steps on mobile and desktop.
- Hero parallax, Research looping, compact/cropped mobile style guide, integration rows, testimonial controls and spacing match the reviewed version. The Stage logo remains static; the experimental flash was removed.
- Reduced-motion preferences are respected.
- `../public/landing-preview/config.js` has intentionally unset installer, login, contact, legal and social destinations. Connect the verified production destinations before promotion. The existing preview behavior explains unavailable destinations.
- Media, icons, fonts and vendor license notices are included alongside their assets. Product screenshots and launch/export videos were supplied for this design; landscape layers were generated for it.
- This screen is a review handoff, not a replacement for the existing production homepage.
