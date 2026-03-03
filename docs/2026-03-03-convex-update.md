# 3 maart 2026 — Convex Integratie Handoff

## Doel van deze handoff

Dit document is bedoeld voor de volgende agent die verder werkt aan dit klantproject.

De kern van deze ronde was:

- Convex als echte backend koppelen
- bestaande dashboard/project/task/settings flows laten lezen en schrijven naar Convex
- geen herontwerp van de UI doen
- auth nog niet integreren
- R2 nog niet integreren

De huidige staat is bruikbaar als tussenstap, maar is niet release-klaar.
Er staan nog een paar duidelijke inconsistenties en tijdelijke oplossingen in de code die eerst opgeschoond moeten worden.

## Wat er technisch wel is gedaan

### 1. Convex is gekoppeld aan de app

Toegevoegd / aangesloten:

- `app/src/main.tsx`
- `app/src/lib/convex.ts`
- `app/.env.local`
- `app/.gitignore`

Lokale env-config bevat:

- `CONVEX_DEPLOYMENT`
- `CONVEX_DEPLOY_KEY`
- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`

Bedoelde deployment:

- `https://reliable-bullfrog-917.convex.cloud`
- `https://reliable-bullfrog-917.convex.site`

### 2. Convex backend modules toegevoegd

Toegevoegd:

- `app/convex/schema.ts`
- `app/convex/_helpers.ts`
- `app/convex/dashboard.ts`
- `app/convex/projects.ts`
- `app/convex/tasks.ts`
- `app/convex/portal.ts`
- `app/convex/settings.ts`

Convex `_generated` files bestaan ook.

### 3. Deze schermen gebruiken nu Convex i.p.v. de runtime mock-flow

Aangesloten:

- `app/src/components/dashboard/DashboardPage.tsx`
- `app/src/components/creation/ProjectCreationPage.tsx`
- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/task/TaskDetailPage.tsx`
- `app/src/components/portal/ClientPortalPage.tsx`
- `app/src/components/settings/SettingsPage.tsx`

### 4. Wat functioneel nu echt werkt

#### Dashboard

Leest nu via Convex:

- projecten
- fase/task samenvattingen
- upcoming items
- recent activity
- payment overview read-model

#### New Project

Schrijft nu via Convex:

- user lookup/upsert op email
- client upsert
- project create
- phases create
- portal config create

Belangrijke correctie:

- `Import from URL` gebruikt nu de echte URL en niet meer een random placeholder-avatar

#### Project Detail

Leest nu via Convex:

- project
- phases
- tasks
- portal state

Schrijft nu via Convex:

- task completion toggle
- share/portal enabled toggle
- project name update
- client update
- timeline update
- phases sync
- project status toggle
- delete project
- create task

#### Task Detail

Schrijft nu via Convex:

- task title
- task content
- task completion
- attachment metadata
- upload URL generation

#### Client Portal

Leest nu via Convex:

- project by share token
- portal enabled status
- portal branding

#### Settings

Leest nu via Convex:

- profile
- subscription read model
- payment connection read model
- portal branding
- preview portal url

Schrijft nu via Convex:

- name
- avatar url/data url
- portal logo
- portal accent color

## Huidige Convex tabellen

In `app/convex/schema.ts` staan nu:

- `users`
- `clients`
- `projects`
- `phases`
- `tasks`
- `attachments`
- `portalConfigs`
- `subscriptions`
- `paymentConnections`
- `invoices`
- `payments`

Belangrijke scheiding:

- `subscriptions` = Stage eigen SaaS billing
- `paymentConnections`, `invoices`, `payments` = freelancer payment/invoicing data

## Wat bewust nog niet is gedaan

### 1. Auth

Nog niet geïntegreerd:

- Convex Auth
- Google auth
- email OTP

Huidige auth is nog mock/placeholder in:

- `app/src/lib/auth.ts`
- `app/src/components/auth/AuthPage.tsx`

### 2. R2 / file strategy

Nog niet geïntegreerd:

- Cloudflare R2 component
- eigen Hono + R2 uploadlaag
- definitieve naming/caching strategy voor images/files

### 3. Echte billing / payment provider flows

Nog niet geïntegreerd:

- Stage eigen subscription provider
- Stripe connect flow
- restricted-key import flow
- echte billing management schermen

## Wat nu fout of slordig is

Dit deel is belangrijk. Dit zijn de zaken die een volgende agent eerst moet begrijpen en opschonen.

### 1. Settings toont altijd `Name updated successfully`

File:

- `app/src/components/settings/SettingsPage.tsx`

Probleem:

- de tekst `Name updated successfully` staat statisch in de JSX
- hij is niet gekoppeld aan save-state
- hij staat dus altijd zichtbaar, ook zonder save

Conclusie:

- dit is fout gedrag
- dit is geen echte statusmelding
- deze feedback moet later óf correct state-driven gemaakt worden óf volledig verwijderd worden

### 2. Er zitten nog browser `alert`, `prompt` en `confirm` calls in de app

Files:

- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/settings/SettingsPage.tsx`

Concreet:

#### Project detail gebruikt nu tijdelijke browser prompts voor:

- `Add a task...`
- `Edit project name`
- `Edit client`
- `Adjust timeline`
- `Add or remove phases`
- `Delete project`

Daar zitten `window.prompt` en `window.confirm` in.

#### Settings gebruikt nu tijdelijke browser alerts voor:

- save-fouten
- delete account placeholder
- billing provider placeholder
- plan changes placeholder
- payment method placeholder
- payment connect placeholder
- custom domains placeholder

Conclusie:

- technisch werkt dit als tijdelijke wiring
- productmatig is dit niet acceptabel voor live
- dit moet vervangen worden door echte UI-flows of tijdelijk uitgeschakeld worden

### 3. Avatar-bronnen zijn nu inconsistent

Dit verklaart de screenshots waarin op de ene plek een foto staat en op de andere plek niet.

#### Oorzaak A: mock auth user heeft een hardcoded foto

File:

- `app/src/lib/auth.ts`

Daar staat nog steeds:

- `avatarUrl: "https://randomuser.me/api/portraits/men/46.jpg"`

#### Oorzaak B: navbar gebruikt de auth-avatar

File:

- `app/src/components/shared/Navbar.tsx`

Gedrag:

- top-right avatar op dashboard/settings leest `user?.avatarUrl` uit mock auth
- daardoor kan daar een foto staan, ook als er in Convex nog geen profiel-avatar staat

#### Oorzaak C: settings gebruikt Convex profieldata

File:

- `app/src/components/settings/SettingsPage.tsx`

Gedrag:

- settings-avatar leest `settingsData.profile.avatarUrl`
- als Convex daar geen avatar heeft, zie je de letter-fallback

#### Oorzaak D: new project header gebruikt alleen initials

File:

- `app/src/components/creation/ProjectCreationPage.tsx`

Gedrag:

- die pagina gebruikt `getInitials(user?.name ?? "SN")`
- dus daar verschijnt geen foto in de header, alleen initials

Conclusie:

- dit is een echte inconsistentie
- de kernoorzaak is dat auth nog mock is en niet op dezelfde user source zit als settings/profile

### 4. Frontend is gedeployed, maar Convex backend-deploy is vanuit deze omgeving niet betrouwbaar bevestigd

De user heeft frontend deployment gedaan via:

- `pnpm run production:deploy`

Dat is succesvol geweest voor de Cloudflare Worker/frontend assets.

Wat vanuit deze omgeving niet betrouwbaar lukte:

- `npx convex dev --once`

Probleem bij eerdere poging:

- sandbox/netwerk issues
- Sentry telemetry fetch failure
- daarna nog fetch failure

Conclusie:

- frontend deploy is bevestigd
- backend Convex deploy moet apart nog bewust worden gecontroleerd als er backend-code is veranderd na de laatste betrouwbare Convex sync

## Antwoorden op de concrete vragen van de user

### 1. Waarom staat er altijd `Name updated successfully`?

Omdat die tekst nu hardcoded in `SettingsPage.tsx` staat.
Niet omdat er echt een save success state wordt berekend.

### 2. Hoe kan die foto daar staan?

Omdat de navbar nog de mock auth user gebruikt uit `app/src/lib/auth.ts`, en die mock user heeft een hardcoded avatar URL.

### 3. Waarom heeft `Create new project` geen foto maar dashboard wel?

Omdat `Create new project` header alleen initials rendert, terwijl dashboard/settings navbar de mock auth avatar rendert.
Dus er zijn nu twee verschillende avatar-bronnen in de app.

## Wat nog gedaan moet worden

### 1. Eerst opschonen van tijdelijke UI-wiring

Prioriteit hoog:

- alle browser `prompt/confirm/alert` verwijderen of vervangen
- statische succesmeldingen verwijderen
- fake placeholder acties duidelijk afschermen of echt implementeren

### 2. Auth correct integreren

Gekozen richting volgens user:

- Convex Auth
- Google auth
- email OTP

Daarna moet de hele app dezelfde user source gebruiken voor:

- navbar avatar
- settings profile
- dashboard greeting
- permission checks
- project ownership

### 3. Image/file strategy vastzetten

R2 is nog in research.

Wel alvast technisch uitgangspunt:

- immutable object keys zijn goed voor caching
- voor display assets/avatars is een `uuid.webp` of content-hash `.webp` variant logisch
- niet elk bestand hoeft letterlijk altijd `uuid.webp` te zijn
- originele uploads en afgeleide webp-varianten kunnen apart bestaan

Definitieve keuze moet nog worden gemaakt voor:

- original vs derived asset storage
- naming strategy
- cache headers
- image normalization pipeline

### 4. Settings verder afmaken

Nog niet echt klaar:

- delete account
- billing provider actions
- payment method management
- payment account linking
- custom domains

### 5. Payments/billing verder afmaken

Nog te beslissen en te implementeren:

- Stage eigen subscription provider: Stripe / Polar / Creem
- freelancer payment read-only v1 flow
- Stripe connect later voor deeper invoicing/payments control

## Release-risico's als er nu niets wordt opgeschoond

### Hoog risico

- browser prompts/confirms/alerts blijven in productie zichtbaar
- avatar inconsistentie blijft zichtbaar
- settings geeft misleidende feedback
- auth en profieldata blijven uit sync

### Middel risico

- frontend is nieuwer dan Convex backend deployment
- placeholder billing actions lijken klikbaar maar doen niets nuttigs

### Lager risico

- build waarschuwingen over chunk size
- empty `react-vendor` chunk

Deze laatste zijn nu geen release blockers, maar wel later optimaliseren.

## Richtlijn voor de volgende agent

Niet direct verder bouwen op nieuwe features.
Eerst deze volgorde aanhouden:

1. tijdelijke prompts/alerts/succesmeldingen opschonen
2. avatar/user source consistent maken
3. Convex Auth integreren
4. daarna pas R2/file storage
5. daarna pas billing/payment provider keuze uitwerken

## Bestanden die de volgende agent eerst moet lezen

- `app/src/lib/auth.ts`
- `app/src/components/shared/Navbar.tsx`
- `app/src/components/settings/SettingsPage.tsx`
- `app/src/components/project/ProjectDetailPage.tsx`
- `app/src/components/creation/ProjectCreationPage.tsx`
- `app/convex/schema.ts`
- `app/convex/settings.ts`
- `app/convex/projects.ts`
- `app/convex/tasks.ts`

## Laatste bekende lokale status

- `pnpm typecheck` was groen na de laatste fix in `app/convex/settings.ts`
- frontend deploy naar Cloudflare Worker is door de user uitgevoerd en geslaagd
- auth is nog mock
- R2 is nog niet gestart

