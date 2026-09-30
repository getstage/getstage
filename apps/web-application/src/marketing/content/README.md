# Website content (getstage.co)

Every marketing page, use case, blog post and redirect lives in
[`content.json`](content.json). Edit it, commit, and ship.

## Publish (every time)

```sh
git checkout website && git pull --rebase    # 1. start from the latest version
# 2. make your changes (with your AI)
git add . && git commit -m "What you changed"  # 3. save
pnpm web:test                                  # 4. check it on testing.getstage.co
pnpm web:ship                                  # 5. looks good → live on getstage.co
```

Both commands check first: you are on `website`, everything is saved, you have
the latest version from GitHub, you only changed the website folders, and the SEO
rules pass. If a check fails, nothing is deployed and the message says what to do.
`web:ship` also pushes your commits to GitHub before it deploys.

**Once, on a new computer:** `git config pull.rebase true`, then
`pnpm --filter stage-app exec wrangler login` with a Cloudflare account that has
access to Stage.

**Local preview (optional):** `pnpm web:dev`, then open the page on localhost.

## What goes where

| In `content.json` | URL | Notes |
|---|---|---|
| `pages[]` | `/<slug>` | Built from blocks, first block is always one `hero` |
| `useCases[]` | `/use-cases/<slug>` | Also in the navigation dropdown, in this order |
| `blogPosts[]` | `/blog/<slug>` | Newest first. Thumbnail in `public/blog/<youtubeId>.jpg` |
| `redirects[]` | `from` → `to` | Add one when you rename or delete a published URL |

Slugs are lowercase words with dashes. URLs the app already uses (`download`,
`blog`, `auth`, `dashboard`, …; full list in `paths.ts`) cannot be page slugs.

## Blocks for pages

`hero`, `richText`, `steps`, `checklist`, `faq`, `cardGrid`, `useCaseLinks`,
`blogList`, `video`, `image`, `cta`. Their fields are in [`schema.ts`](schema.ts)
and they render in `src/components/marketing/ContentPage.tsx`. For a layout that
no block covers, add a new block type (schema + renderer) or a React component.

```json
{
  "slug": "for-studios",
  "title": "For studios",
  "seo": {
    "metaTitle": "Stage for design studios",
    "metaDescription": "Plan research, direction and structure for every client project in one shared workspace for your studio.",
    "noIndex": false
  },
  "blocks": [
    { "type": "hero", "eyebrow": "Studios", "heading": "Plan every client project in one place.", "buttonLabel": "Try free for macOS", "buttonHref": "/download" },
    { "type": "faq", "heading": "Questions", "items": [{ "question": "Is there a trial?", "answer": "Yes, 14 days." }] },
    { "type": "cta", "heading": "Try Stage on your next project.", "buttonLabel": "Try free for macOS", "buttonHref": "/download" }
  ]
}
```

## SEO checks (the build refuses to ship when one fails)

- `metaTitle` at most 70 characters, `metaDescription` 50–160.
- A page starts with exactly one `hero` (it is the page's H1); text sections use
  headings from level 2.
- No two entries on the same URL, no reserved URLs.
- Internal links (`/…`) must point to a page that exists; external links use `https://`.
- Related use cases on blog posts must exist.

`"noIndex": true` keeps a page out of Google and the sitemap (drafts, campaign pages).

## Who changes what

You can ship changes to these folders only; ship refuses anything else:

- `apps/web-application/src/marketing/` (this content)
- `apps/web-application/src/components/marketing/`
- `apps/web-application/src/components/stage-landing/`
- `apps/web-application/public/`

Login, billing, portal, routes and the rest of the app belong to the developers
(Werner, Vilém). They merge finished app work into `website`; ship also refuses to
publish their commits for them. Need a change outside your folders? Ask Werner.
