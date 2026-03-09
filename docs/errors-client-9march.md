# Client Errors - 2026-03-09

## Context

These issues came from live client testing on Monday, March 9, 2026.

This file separates:
- confirmed product/UX issues
- confirmed technical root causes
- likely follow-up fixes

## Status Update

The following onboarding changes are now implemented in code and passed `pnpm typecheck`:

- Added a dedicated loading step: `AI is generating your roadmap...`
- Wired onboarding to create the project during the `creating` step instead of only marking onboarding complete
- Moved onboarding/new-project client photo handling away from base64 mutation payloads and onto the existing R2 upload flow
- Restored onboarding confetti only after a successful project creation, not during the fake loading step

These items still need browser verification in testing before they can be marked fully closed.

## 1. OTP code input does not support paste

**What the client saw**

- On the "Check your email" screen, pasting the full 6-digit code into the verification inputs does not work properly.

**Confirmed cause**

- The OTP UI is built as 6 separate single-character inputs in `app/src/components/auth/AuthPage.tsx`.
- The current handler truncates any pasted value to the last character only.
- There is no `onPaste` handler that distributes a pasted 6-digit code across all 6 boxes.

**Code reference**

- `app/src/components/auth/AuthPage.tsx:65`

**Impact**

- Login feels broken or unnecessarily slow.
- This is especially bad on desktop where users copy the full code from email.

**Fix direction**

- Add an `onPaste` handler.
- Accept a 6-digit pasted string.
- Split it across all inputs.
- Auto-submit once all 6 digits are filled.

## 2. "Field of work" is single-select, but many designers are multi-disciplinary

**What the client saw**

- The onboarding step only allows one choice such as Branding or Web Design.
- The client feedback is valid: many designers work across multiple disciplines.

**Confirmed cause**

- The onboarding model is hard single-select in both frontend and backend.
- `fieldOfWork` is a single `ProjectType | null`.
- `workCategory` in Convex is also a single enum value, not an array.

**Code references**

- `app/src/components/onboarding/OnboardingModal.tsx:290`
- `app/convex/onboarding.ts:5`
- `app/convex/schema.ts:155`

**Impact**

- The captured profile data is too narrow.
- Any roadmap or onboarding personalization based on this value is less accurate.

**Fix direction**

- Decide between:
  - multi-select skills
  - primary skill + secondary skills
- Update both frontend state and Convex schema accordingly.

## 3. Missing onboarding loading state for "AI is generating the roadmap"

**What the client wants**

- After the relevant onboarding step, there should be a loading state saying AI is generating the roadmap.

**Current behavior**

- Onboarding goes straight into the roadmap preview.
- The only loading-like step is later and says `Setting up your dashboard...`, not roadmap generation.

**Confirmed cause**

- The onboarding AI flow goes `method -> timeline -> preview`.
- The later `creating` step is generic dashboard setup copy, not roadmap generation copy.

**Code references**

- `app/src/components/onboarding/OnboardingModal.tsx:323`
- `app/src/components/onboarding/OnboardingModal.tsx:835`
- `app/src/components/onboarding/OnboardingModal.tsx:938`
- `app/src/components/onboarding/OnboardingModal.tsx:1333`

**Impact**

- The experience does not match the product promise.
- It feels instant/template-based, not like a generated roadmap flow.

**Fix direction**

- Insert a dedicated loading step before the roadmap preview for the AI path.
- Use explicit copy such as `AI is generating your roadmap...`.
- If no real AI call exists, still make the state honest and intentional.

## 4. Onboarding suggests a project is being created, but no project is actually created

**What the client saw**

- They completed onboarding expecting a project/dashboard setup.
- After onboarding, no actual project appears in the real dashboard.

**Confirmed cause**

- Onboarding collects project data into `pendingSubmission`.
- But the dashboard completion handler only calls `completeOnboarding`.
- It never calls `api.projects.create`.

**Code references**

- `app/src/components/onboarding/OnboardingModal.tsx:335`
- `app/src/components/onboarding/OnboardingModal.tsx:366`
- `app/src/components/dashboard/DashboardPage.tsx:128`

**Impact**

- Core expectation is broken.
- The UI implies project creation, but the backend does not do it.

**Fix direction**

- Either:
  - actually create the project during onboarding
- Or:
  - remove all wording that implies the project is already being created

## 5. Project creation can fail when the client photo is large

**What the client saw**

- The create project flow shows `Could not create the project.`

**Confirmed backend error**

- `Uncaught Error: Value is too large (5.69 MiB > maximum size 1 MiB)`

**Confirmed cause**

- The client photo is currently stored as a base64 data URL in frontend state.
- That full data URL is sent inside the Convex mutation args as `clientAvatarUrl`.
- Convex rejects payloads above its 1 MiB argument limit.

**Code references**

- `app/src/components/onboarding/OnboardingModal.tsx:342`
- `app/src/components/onboarding/OnboardingModal.tsx:464`
- `app/src/hooks/useProjectCreation.ts:238`
- `app/convex/projects.ts:82`

**Impact**

- Project creation fails for larger images.
- This will also affect onboarding project creation once onboarding is actually wired to create projects.

**Fix direction**

- Do not send image data URLs through Convex mutations.
- Upload the image first to R2/storage.
- Only send the resulting key/URL through the mutation.
- Also add a frontend size limit and validation message.

## 6. Onboarding modal can trap the user

**What the client saw**

- When the flow gets stuck or feels wrong, they cannot simply close the onboarding window.

**Confirmed cause**

- The modal intentionally blocks close behavior.
- Outside click is prevented.
- Escape is prevented.
- There is no visible close button.
- During `creating`, `goBack()` is also disabled.

**Code references**

- `app/src/components/onboarding/OnboardingModal.tsx:528`
- `app/src/components/onboarding/OnboardingModal.tsx:541`
- `app/src/components/onboarding/OnboardingModal.tsx:403`

**Impact**

- High frustration when any step misbehaves.
- A minor bug becomes a hard blocker because the user cannot escape the flow.

**Fix direction**

- Add a visible close action.
- Allow safe exit on non-critical steps.
- Add cancel/retry behavior for loading and error states.

## 7. Auth-related "Not authenticated" errors are still being fired during app bootstrap

**What showed up**

- Multiple Convex errors like:
  - `Not authenticated` in `dashboard.ts`
  - `Not authenticated` in `onboarding.ts`
  - `Not authenticated` in `settings.ts`
  - `Not authenticated` in `googleSheets.ts`
  - `Not authenticated` in `stripeConnect.ts`

**Confirmed cause**

- At least one protected query is definitely being called before auth/user state is fully ready:
  - `DashboardPage` calls `api.dashboard.getOverview` unconditionally.
- The rest likely come from similar auth bootstrapping races during page transitions or load.

**Code reference**

- `app/src/components/dashboard/DashboardPage.tsx:47`

**Impact**

- Console noise
- unnecessary failed requests
- harder debugging during real client sessions

**Fix direction**

- Audit all protected queries/actions.
- Skip them until auth state is fully resolved.
- Use the same auth gating pattern consistently across pages.

## 8. Separate known billing issue on testing

**What was already investigated today**

- The `Upgrade` flow in testing can fail even when Stripe env vars are configured.

**Confirmed cause**

- A stale Stripe customer ID is stored in Convex, but that customer no longer exists in Stripe test mode.
- Convex logs showed:
  - `No such customer: 'cus_U7LBOtYICAF4k0'`

**Impact**

- Upgrade/checkout can fail for some testing accounts.

**Fix direction**

- Add self-healing around checkout customer creation.
- If Stripe says the stored customer does not exist, recreate/relink the customer automatically.

## Recommended order

1. Fix onboarding project creation mismatch.
2. Fix large image upload handling for client avatars.
3. Add modal escape/close path.
4. Add OTP paste support.
5. Add proper AI roadmap loading state.
6. Redesign field-of-work capture for multi-skill creatives.
7. Clean up auth bootstrap query guards.
8. Patch stale Stripe customer recovery in testing.
