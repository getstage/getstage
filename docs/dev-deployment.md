# Dev Deployment

## Current auth model

Stage currently uses:

- `Loops OTP` for email sign-in
- `Google OAuth`
- `6-digit` email verification codes

Stage currently does **not** use:

- email + password sign-in
- forgot password
- reset password

That means forgot/reset password is **not implemented** right now, because there is no password-based auth flow in the product yet.

## What is already implemented

- Convex Auth backend
- Loops OTP provider
- Google provider wiring
- `6-digit` OTP generation
- authenticated route group under `/_authed`
- frontend email code entry UI

Code references:

- [auth.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/auth.ts)
- [LoopsOTP.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/LoopsOTP.ts)
- [AuthPage.tsx](/Users/wernerjohannesdieben/stage_mvp/app/src/components/auth/AuthPage.tsx)

## What still needs to be created

### 1. Loops

Your client still needs to create:

- a `Loops API key`
- a `transactional email`
- a `code` variable inside that email template

Required Convex env vars:

- `AUTH_LOOPS_API_KEY`
- `AUTH_LOOPS_TRANSACTIONAL_ID`

## 2. Google OAuth

Your client still needs to create:

- a Google Cloud project
- an OAuth consent screen
- an OAuth client ID of type `Web application`

Required redirect URI:

```txt
${CONVEX_SITE_URL}/api/auth/callback/google
```

Examples:

- local/dev: `https://your-dev-deployment.convex.site/api/auth/callback/google`
- production with custom auth domain: `https://auth.yourdomain.com/api/auth/callback/google`

Required Convex env vars:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

## 3. Convex Auth signing keys

These are required by `@convex-dev/auth` itself:

- `JWT_PRIVATE_KEY`
- `JWKS`

What they are:

- `JWT_PRIVATE_KEY`: the RSA private key Convex Auth uses to sign login tokens
- `JWKS`: the public key set exposed by Convex so clients and services can verify those tokens

These are **not** Google keys and **not** Loops keys.

## 4. Convex site URL

Required Convex env var:

- `CONVEX_SITE_URL`

Optional but recommended later for production:

- `CUSTOM_AUTH_SITE_URL`

Use `CUSTOM_AUTH_SITE_URL` if you do not want users to see the default `*.convex.site` domain during OAuth.

## Full required Convex env vars

- `AUTH_LOOPS_API_KEY`
- `AUTH_LOOPS_TRANSACTIONAL_ID`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `CONVEX_SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`

## Local and deploy commands

Run project commands from [app](/Users/wernerjohannesdieben/stage_mvp/app), not from the repo root.

```bash
cd app
pnpm typecheck
npx convex dev
pnpm run build:production
pnpm run production:deploy
```

## OTP status

The current email flow uses a `6-digit` code.

Code reference:

- [LoopsOTP.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/LoopsOTP.ts#L15)

## Forgot / Reset password status

Not implemented.

Reason:

- Convex Auth password reset belongs to the `Password` provider flow
- this app currently uses passwordless email OTP + Google
- adding forgot/reset password would mean adding password auth as a new product flow

If you decide to add password auth later, then we should implement:

1. `Password` provider in `convex/auth.ts`
2. reset email provider
3. forgot password UI
4. reset verification UI
5. password validation rules

## Recommended next steps

1. Let the client create the Loops API key and transactional email.
2. Let the client create the Google OAuth client.
3. Add all Convex env vars.
4. Run `npx convex dev`.
5. Test:
   - send OTP
   - verify OTP
   - Google sign-in
   - sign-out

## Sources

- Convex Auth advanced docs: https://labs.convex.dev/auth/advanced
- Convex Auth passwords docs: https://labs.convex.dev/auth/config/passwords
- Loops Auth.js docs: https://loops.so/docs/integrations/authjs
