# Loops Setup Checklist

This repo now uses `LoopsOTP` for email OTP delivery.

## Current implementation

Email sign-in uses:

- [LoopsOTP.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/LoopsOTP.ts)
- [auth.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/auth.ts)
- [AuthPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/auth/AuthPage.tsx)

This is separate from the optional `@devwithbobby/loops` Convex component.

## Install command

Exact package command from the component request:

```bash
npm install @devwithbobby/loops
```

Equivalent for this repo:

```bash
pnpm add @devwithbobby/loops
```

## Exact setup checklist

### For Stage auth OTP with Loops

1. Create a Loops API key in Loops settings.
2. Create and publish a transactional email in Loops for the login code.
3. Add a `code` data variable to that transactional template.
4. Set Convex environment variables:
   - `AUTH_LOOPS_API_KEY`
   - `AUTH_LOOPS_TRANSACTIONAL_ID`
5. Keep [LoopsOTP.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/LoopsOTP.ts) as the email provider used by [auth.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/auth.ts).
6. Make sure the frontend calls `signIn("loops-otp", ...)`.
7. Run `npx convex dev`.
8. Test send, verify, invalid code, expired code, and sign out.

### If you also want the `@devwithbobby/loops` Convex component

This is for Loops platform integration as a Convex component. It is not required for OTP auth.

1. Install the package.
2. Add `app/convex/convex.config.ts`.
3. Register the component with `defineApp()` and `app.use(...)`.
4. Run `npx convex dev` so Convex generates the component API.
5. Wire the generated component API into the backend functions that need Loops contact or event features.

## Required environment variables

For the current Stage OTP flow:

- `AUTH_LOOPS_API_KEY`
- `AUTH_LOOPS_TRANSACTIONAL_ID`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `CONVEX_SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`

Optional fallback currently supported in code:

- `LOOPS_TRANSACTIONAL_ID`

## Sources

- Convex Components overview: https://docs.convex.dev/components
- Convex Components install flow: https://docs.convex.dev/components/using
- Loops Auth.js integration: https://loops.so/docs/integrations/authjs

Note:

- I could not retrieve the rendered contents of the exact `@devwithbobby/loops` component page from the web tool, so the component-specific checklist above follows Convex's documented component install pattern plus this repo's current Loops OTP implementation.
