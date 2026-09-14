# Ship Today — 14 September 2026

Keep this short. Werner owns visual approval. Do not ship Details.so, project-category changes, or Figma work in this release.

## Do now — in this order

- [x] Consolidated today's website/pricing work and the desktop `v0.2.34` release history in the existing branch `codex/responsive-landing-preview`; PR #79 targets `work`.
- [ ] **URGENT — recover production Convex.** The successful production deploy was run from `codex/responsive-landing-preview`, which is based on desktop production `0.2.15`. Convex deploy uploads the complete backend, not only the pricing file, so newer `v0.2.29` GitHub-import and wireframe/export functions may currently be missing from production.
- [x] Merge the recovery/release history into the current branch. The fixed billing model remains `start` = Solo, `pro` = Studio, `team` = Agency.
- [ ] Deploy that recovery backend to production `https://quirky-snail-763.convex.cloud`. The last recovery attempt did **not** deploy: it used the old development `.env.local`, selected `reliable-bullfrog-917`, and stopped with `401 MissingAccessToken`. Do not use that env file for the production recovery.
- [ ] Fix trusted production auth (`STA-23`): connect a branded Convex HTTP/auth domain such as `auth.getstage.co`, update DNS and production auth origins, redeploy, and confirm login returns to the desktop app.
- [ ] Preserve today's deployed website in Git and confirm the live Pricing, Legal, login, and download links.
- [x] `prod-v0.2.32` release completed successfully in GitHub Actions (run `34860380296`).
- [x] `prod-v0.2.33` completed successfully in GitHub Actions (run `34865275451`) with signed/notarized arm64 and x64 artifacts and the product-specific Flows screen fix.
- [ ] Install `prod-v0.2.33`, regenerate Flows once for the affected crypto project, and confirm Wireframes receives product screens.
- [x] Desktop fixes committed as `8a6289ae` and pushed: onboarding defaults to Solo $29, “See All Plans” retains Solo/Studio/Agency, tokenized URLs are allowed only for exact Stripe checkout/billing hosts, and the Node 22 dual-stack DNS callback for exported photos is fixed. Desktop production build passes.

## After the release is safe

- [ ] Validate testing desktop `v0.2.34` (GitHub Actions run `34885017178`, currently building): after the first successful Stripe checkout, the dashboard should open blurred behind the embedded onboarding demo; closing it must prevent repeat display on later checkout returns.
- [ ] Customer quick fixes (`STA-39`): text-field focus, PDF upload error, four-competitor cap, and Figma plugin/version message.
- [x] Fix generic website screens for app/platform projects at the source: the Flows prompt now classifies the intended product surface, prioritizes domain-specific product screens, and no longer uses a landing-page/demo flow as its schema example. Rust Flows tests pass. Shipped as tag `prod-v0.2.33`; affected projects must regenerate Flows once after updating.
- [ ] Figma pairing/export check last.

## Already done

- [x] React/WebP landing and Solo $29, Studio $99, Agency $249 pricing.
- [x] Stripe price variables and credit/seat limits prepared: Solo 2,000/1, Studio 10,000/5, Agency 30,000/15.
- [x] Terms and Privacy routes connected locally; Werner deployed the website.
- [x] Lo-Fi/export entered through `v0.2.29`; desktop production has reached `prod-v0.2.33`.

## Important locations

- Main working tree: `/Users/wernerjohannesdieben/stage_mvp-wireframes-rig-nebius-aug28`
- Unified current branch: `codex/responsive-landing-preview`
- Pull request to `work`: GitHub PR #79
- Linear: `STA-23` trusted login domain, `STA-39` customer bugs, `STA-33` Lo-Fi/export refocus

Internal billing keys remain stable: `start` = Solo, `pro` = Studio, `team` = Agency.
