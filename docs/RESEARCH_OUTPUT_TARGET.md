# Research Output — Target Example

**Purpose:** This is what a *good* Research artifact looks like, end to end, so we can
work backward to make the engine + prompt + UI produce it **every time**.

Worked example uses the real project from the screenshots:

- **Project:** Test Project #2
- **Client:** Adrien Ninet
- **Industry:** E-commerce (B2B Wholesale)
- **Website:** https://www.shopify.com
- **Brief / focus:** Wholesale dashboard UX benchmark

Every section below names the **typesafe field** it maps to in
`packages/data-ops/src/contracts/research.ts`, so the contract, the prompt, and the
UI all agree. **Rule: no field that the schema marks `.min(1)` is ever empty, and no
matrix cell is ever "N/A" for a real competitor.** If the model returns an empty
required field, the engine re-asks — it does not save garbage.

---

## 1. Research Summary  → `title` + `summary: string[]`

> **Fix:** today this is a single bullet. It must be 3–5 bullets that tell the story:
> what we benchmarked, the dominant pattern, the biggest gap, and the headline
> opportunity.

**Title:** Wholesale Dashboard UX Benchmark — Test Project #2

**Summary**
- Adrien Ninet is building a **B2B wholesale ordering dashboard** on Shopify. This
  benchmark studies how leading wholesale platforms structure bulk ordering, account
  management, and reordering — not their marketing sites.
- The dominant winning pattern is **"reorder-first"**: returning buyers land on a
  one-click reorder surface, not a storefront. Faire and Shopify B2B both do this.
- The category's biggest weakness is **first-time buyer onboarding** — most platforms
  assume an existing relationship and skip any guided setup, so new accounts feel lost.
- **Headline opportunity:** a calm, reorder-led dashboard with a guided 60-second
  first-run beats denser incumbents like Alibaba on clarity without losing power.

---

## 2. Company Snapshot  → `companySnapshot: { label, value }[]`

| Label | Value |
|---|---|
| Client | Adrien Ninet |
| Industry | E-commerce (B2B Wholesale) |
| Website | https://www.shopify.com |
| Project Name | Test Project #2 |
| Research Focus | Wholesale dashboard UX benchmark |

---

## 3. Competitive Analysis  → `competitiveAnalysis`

### 3a. Matrix View  → `matrixRows[].cells[] = { competitorId, score }`

> **Matrix shows ONLY the score** — a colored pill, nothing else. No reason, no note
> text. **Strong** (green), **OK** (amber), **Weak** (red). The *reasons* live in Card
> View (strengths/weaknesses), never here.
> **Never "N/A" for a real competitor** — a real competitor always gets a real score.

| Dimension | Faire | Alibaba | Shopify B2B |
|---|---|---|---|
| **Navigation** | 🟢 Strong | 🟢 Strong | 🟢 Strong |
| **Onboarding** | 🟠 OK | 🔴 Weak | 🟠 OK |
| **Bulk Ordering** | 🟢 Strong | 🟢 Strong | 🟠 OK |
| **Reorder Flow** | 🟢 Strong | 🟠 OK | 🟢 Strong |
| **Account Management** | 🟠 OK | 🟢 Strong | 🟢 Strong |
| **Pricing Visibility** | 🟢 Strong | 🟢 Strong | 🟠 OK |
| **Mobile Experience** | 🟢 Strong | 🔴 Weak | 🟢 Strong |

*(Each cell is just `score` = `Strong | OK | Weak` rendered as a colored pill. The
"why" is never in the matrix — it's in the Card View below.)*

### 3b. Card View  → `competitors[] = { name, url, logoUrl, positioning, summary, strengths[], weaknesses[] }`

> Every card has **positioning**, a one-line **summary**, **≥2 strengths**, and **≥2
> weaknesses**. None of these are ever empty.

**Faire** · faire.com
- **Positioning:** Wholesale marketplace connecting indie brands with retailers.
- **Summary:** Reorder-first dashboard tuned for repeat small-batch buyers.
- **Strengths**
  - Reorder is the default landing action for returning buyers — minimal clicks to repeat.
  - Wholesale price and retail margin shown per item, so buyers decide fast.
- **Weaknesses**
  - First-time buyer onboarding is thin; no guided path to a first order.
  - Team/approval roles are basic — weak for larger buying orgs.
- **What this means for you:** Steal the reorder-first landing; beat them on first-run onboarding.

**Alibaba** · alibaba.com
- **Positioning:** Global B2B marketplace with massive catalog and MOQ tiering.
- **Summary:** Powerful, dense, conversion-optimized — but overwhelming for newcomers.
- **Strengths**
  - Tiered MOQ pricing surfaced inline before add-to-cart.
  - Deep account structure: sub-accounts, RFQ, granular roles.
- **Weaknesses**
  - Drops new buyers into a dense marketplace with no first-run guidance.
  - Cramped, hard-to-use mobile experience.
- **What this means for you:** Match their pricing transparency; win on calm, mobile-first clarity.

**Shopify B2B** · shopify.com
- **Positioning:** B2B layer on Shopify for brands selling wholesale to their own buyers.
- **Summary:** Clean, one-click reorder, but bulk ordering is hidden in standard cart UI.
- **Strengths**
  - One-click reorder from order history.
  - Company profiles with multiple buyers and price lists per company.
- **Weaknesses**
  - Bulk ordering buried under the standard consumer cart pattern.
  - Onboarding wizard is seller-focused, not buyer-focused.
- **What this means for you:** Their bulk-order UX is weak — a purpose-built quantity grid is your edge.

---

## 4. UI Patterns — *Analysed with Refero*  → `uiPatterns[]`

`researchUiPatternGroupSchema = { title, summary, patternCountLabel,
recognizedPatterns[], examples[] }`, and each example is `{ title, imageUrl,
thumbnailUrl, sourceProduct }`.

> **Fix:** examples must be **real, category-matched Refero screens** shown in a
> **framed card with a light background** (so the screenshot is actually viewable) —
> never a generic placeholder mock, never an off-topic brand. `patternCountLabel` gives
> the "4 of 6 apps use progressive disclosure for onboarding" stat.

### Onboarding
- **patternCountLabel:** "4 of 6 wholesale apps use progressive disclosure for onboarding"
- **summary:** First-run flows that get a buyer to their first order without a wall of fields.
- **examples** (framed image cards, real screens):
  - "Faire — buyer signup" · sourceProduct: Faire
  - "Shopify B2B — buyer invite" · sourceProduct: Shopify
  - "Ankorstore — first order setup" · sourceProduct: Ankorstore
- **recognizedPatterns**
  - One decision per step; advanced settings deferred.
  - Sample/sandbox catalog so the dashboard looks populated before any real work.
  - Single primary CTA per screen.

### Dashboard
- **patternCountLabel:** "5 of 6 lead with a reorder / recent-orders module"
- **summary:** The buyer's home — reorder, recent orders, account status at a glance.
- **examples**
  - "Faire — buyer dashboard" · sourceProduct: Faire
  - "Alibaba — buyer console" · sourceProduct: Alibaba
  - "Shopify B2B — company portal" · sourceProduct: Shopify
- **recognizedPatterns**
  - Reorder module above the fold for returning buyers.
  - Order status / fulfillment timeline as the second priority block.
  - Quiet visual density — data-dense but not cluttered.

### Bulk Ordering
- **patternCountLabel:** "3 of 6 use a quantity-grid add-multiple pattern"
- **summary:** How buyers add many SKUs and quantities in one pass.
- **examples**
  - "Faire — quantity grid" · sourceProduct: Faire
  - "Alibaba — MOQ tier table" · sourceProduct: Alibaba
  - "Shopify B2B — bulk add" · sourceProduct: Shopify
- **recognizedPatterns**
  - Editable quantity grid; totals update live.
  - MOQ / tier pricing shown inline per row.
  - Persistent running order summary.

---

## 5. Target Users  → `targetUsers[] = { name, role, goals[], frustrations[], context, relevance, assumptions[] }`

**Maria — Boutique Owner (Repeat Buyer)**
- **Role:** Owner-operator of a small retail boutique
- **Goals:** Reorder bestsellers fast; track what's arriving; stay within budget
- **Frustrations:** Re-finding past items; unclear lead times; clunky mobile reorder
- **Context:** Orders weekly from her phone between serving customers
- **Relevance:** Primary persona — the reorder-first dashboard is built for her
- **Assumptions:** Has an existing supplier relationship; low patience for setup

**David — Procurement Manager (Org Buyer)**
- **Role:** Procurement for a mid-size retail chain
- **Goals:** Bulk-order across locations; manage approvals; negotiate tier pricing
- **Frustrations:** Weak role/approval controls; no per-location budgets; manual RFQs
- **Context:** Desktop, manages multiple buyers, needs an audit trail
- **Relevance:** Secondary persona — drives account-management requirements
- **Assumptions:** Needs multi-user accounts; values pricing transparency

**Sofia — First-Time Wholesale Buyer**
- **Role:** New retailer placing her first wholesale order
- **Goals:** Understand MOQs and terms; complete a first order with confidence
- **Frustrations:** Jargon, no guidance, fear of ordering wrong quantities
- **Context:** New to wholesale; evaluating whether to commit
- **Relevance:** Activation persona — the onboarding gap is the chance to win her
- **Assumptions:** No prior platform habits; needs a guided first-run

---

## 6. Opportunities  → `opportunities[] = { title, description, sourceSection }`

1. **Reorder-first home** *(from competitiveAnalysis)* — Make one-click reorder the
   default landing for returning buyers. Faire/Shopify prove it; Alibaba buries it.
2. **Guided wholesale onboarding** *(from targetUsers)* — A 60-second first-run that
   explains MOQs and lands a first order. This is the category's biggest open gap.
3. **Quantity-grid bulk ordering** *(from uiPatterns)* — Purpose-built add-multiple grid
   with live totals and inline tier pricing; beats Shopify B2B's consumer-cart pattern.
4. **Mobile reorder** *(from competitiveAnalysis)* — Thumb-reachable reorder for buyers
   like Maria who order on their phones; Alibaba is weak here.
5. **Transparent tier pricing** *(from competitiveAnalysis)* — Show wholesale price +
   margin/tier inline before add-to-cart, matching the category's best.

---

## 7. Open Questions  → `openQuestions: string[]`
- Is the first release buyer-facing only, or does it include the seller/admin side?
- Which payment + terms (net-30, deposits) must the first order flow support?
- How many competitors should the benchmark lock to (set vs. Refero-discovered)?

## 8. Source References  → `sourceReferences[]`
- Faire — buyer dashboard (refero)
- Alibaba — buyer console (refero)
- Shopify B2B — company portal (refero)
- Project brief — "Wholesale dashboard UX benchmark" (user)

---

## How we guarantee this every time (work-backward plan)

1. **Contract is the source of truth** — `research.ts` already requires non-empty
   `summary`, `companySnapshot`, `targetUsers`, `opportunities`, and per-competitor
   `strengths`/`weaknesses`. Add a validation rule: a real competitor always gets a real
   `score` on every matrix row (never an empty/N/A cell).
2. **Prompt mirrors the contract** — give the model this exact shape + a filled example
   (this file). It returns full objects.
3. **Engine validates + re-asks** — if a required field comes back empty, re-ask rather
   than save. Garbage never reaches Convex.
4. **UI renders what's typed** — Matrix = score pills only (green/amber/red), no reason
   text; Card View = strengths/weaknesses (this is where the reasons live); UI Pattern
   examples in framed image cards; multi-bullet summary.

---

## Implementation status (built on `feat/ui-from-dev` — verify against this)

Verification baseline: **95/95 engine tests pass** (`cd apps/stage-engine && cargo test`),
**full `tsc` clean** (`cd apps/user-application && pnpm exec tsc --noEmit`), **zero engine
build warnings**. React changes hot-reload on `pnpm run dev`; engine changes need a
**stage-engine rebuild/restart + Re-run research**.

| # | Target (this doc) | Status | Where it's enforced | Test to check me |
|---|---|---|---|---|
| 1 | Summary = 3–5 bullets | ✅ | `research/prompt.rs` — added `summary rules` block | live re-run (LLM-authored) |
| 2 | Matrix never "N/A" for a real competitor | ✅ deterministic | `research/competitive.rs` `complete_competitive_matrix` (7 canonical rows × every competitor, gaps → `OK`); wired in `convex_store/research_repository.rs` `enrich_research_artifact` + `workflow.rs` section path | `complete_matrix_backfills_missing_cells_with_ok_and_keeps_scores`, `complete_matrix_is_noop_without_competitors` |
| 3 | Matrix = score pill only, no reason | ✅ | `CompetitiveAnalysis.tsx` `MatrixCell` (tinted pill); `note` removed from `researchTab.ts` + `mapResearchArtifactToTabData.ts` | `tsc` + visual |
| 4 | Card view strengths/weaknesses never empty | ✅ | Root cause removed: deleted the competitive-repair LLM pass that wiped them (`drop_unsourced_competitor_content`, `repair_competitive_analysis_once`, `build_competitive_repair_prompt`); added per-competitor ≥1/≥1 rule in `validate_complete_research_artifact` | `validate_complete_research_artifact_accepts_required_sections` |
| 5 | UI Patterns = real, **category-matched** screens (no Skillshare/rework) | ✅ | `refero/service.rs` `keep_screens_matching_category` + `screen_matches_category` (12-wide candidate pool, filter by page-type/title/tags) | `keeps_only_category_matching_screens`, `falls_back_to_candidates_when_nothing_matches` |
| 6 | UI Pattern screenshots framed, fully visible | ✅ | `UiPatterns.tsx` — `object-contain` on `bg-[#F5F5F5]` frame (was `object-cover`, cropping) | visual |
| 7 | "You still have to run research" after navigating away | ✅ | `useResearchRun.ts` — `isRunning` also reads Convex `projectAi.listRuns` (module=research) `status:"running"`; timer reseeds from `startedAt` | `tsc` + navigate-away repro |

**Honest caveats (not deterministic — only the live re-run proves them):**
- The *wording quality* of summary bullets and each competitor's strengths/weaknesses is
  authored by the model. The pipeline now guarantees they are present, non-empty, and not
  wiped — it cannot guarantee they read well without a real run.
- UI Pattern relevance depends on Refero's own metadata. The filter drops off-topic screens
  when Refero tags them; if a category has *zero* tagged matches it falls back to raw hits
  rather than showing an empty row (relevance-or-nothing would leave gaps).

**Net change:** −136 lines in `workflow.rs`, −28 in `section.rs` (deleted a whole LLM
round-trip); the one real addition is the Refero relevance filter (the feature requested).
