# Stripe Connect Live OAuth Debug

## TL;DR

Je appcode is niet het eerste probleem.

Op basis van je Stripe screenshots en de huidige codebase werkt live OAuth nu vooral niet omdat je **live Stripe Connect platform nog niet volledig geconfigureerd is**:

- `Live client ID` staat op **Unavailable**
- `Enable OAuth` is nog niet actief in live
- er staan **geen live redirect URIs** ingesteld

Zolang dat zo is, kan Stage geen werkende live OAuth URL bouwen.

---

## Wat de screenshot concreet laat zien

In live mode zie ik in Stripe:

- `Live client ID: Unavailable`
- `Enable OAuth` is disabled
- `No redirect URIs set`

Dat betekent:

1. Stripe heeft voor live nog geen bruikbare OAuth client voor je platform beschikbaar gemaakt.
2. Je live Connect OAuth flow is nog niet aangezet.
3. Stripe weet nog niet naar welke callback URL het users moet terugsturen.

Dit is genoeg om live OAuth te blokkeren, ook als test mode al werkt.

---

## Waarom dit de app direct blokkeert

De code verwacht dit:

- `STRIPE_CONNECT_CLIENT_ID` in Convex
- `CONVEX_SITE_URL` voor de callback
- een Stripe OAuth authorize URL met exact dezelfde `redirect_uri`

Relevante code:

- [stripeConnect.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/stripeConnect.ts#L23)
- [stripeConnect.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/stripeConnect.ts#L530)
- [stripeConnect.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/stripeConnect.ts#L675)
- [http.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/http.ts#L1)

De flow in code is:

1. Stage leest `STRIPE_CONNECT_CLIENT_ID`
2. Stage stuurt user naar `https://connect.stripe.com/oauth/authorize`
3. Stripe stuurt user terug naar `${CONVEX_SITE_URL}/stripe/connect/callback`
4. Stage wisselt `code` om via `oauth/token`

Als live `client_id` ontbreekt of je live `redirect_uri` niet in Stripe staat, dan faalt dit al vóór of tijdens de redirect.

---

## Meest waarschijnlijke oorzaak

**Waarschijnlijk zit het probleem in Stripe live account activation / Connect live setup, niet in je Convex code.**

Belangrijk:

- test en live zijn aparte configuraties
- een test `client_id` helpt je niet in live
- live redirect URIs moet je apart toevoegen
- je live Convex env moet ook een aparte `STRIPE_CONNECT_CLIENT_ID` hebben

Dit is een inferentie uit:

- je screenshot
- de huidige repo-config
- Stripe docs

Ik kan op basis van alleen de screenshot niet 100% bewijzen welke Stripe-internal prerequisite nog ontbreekt, maar de dashboard state laat wel duidelijk zien dat live OAuth nog niet klaar is.

---

## Wat van Stripe docs wél relevant is

Voor Stage is de grote interactieve platform guide voor een groot deel overkill.

Jij hebt nu vooral dit nodig:

- Standard connected accounts
- OAuth voor bestaande Stripe accounts
- server-side API calls met `Stripe-Account`
- webhooks voor disconnect/status changes

Je hoeft nu **niet** meteen dit allemaal te bouwen:

- destination charges
- transfers
- separate payout orchestration
- application fees
- complex marketplace money movement

Voor jouw huidige use case is het simpel:

`Stage koppelt een bestaande Stripe account van een freelancer om invoices en payments te lezen en te syncen.`

---

## Wat je vandaag moet doen

### De echte volgorde

Doe dit letterlijk in deze volgorde:

1. voeg live OAuth redirect URI toe in Stripe
2. enable live OAuth
3. kopieer live `ca_...` client ID
4. zet live Convex env vars
5. deploy production
6. maak aparte Connect webhook destination
7. test live connect met een andere Stripe account
8. pas daarna debug je eventuele app-flow fouten

### 1. Maak live Connect OAuth in Stripe af

In live mode, in Stripe Dashboard:

1. Ga naar `Settings > Connect > Onboarding options > OAuth`
2. Voeg deze live redirect URI toe:

```text
https://quirky-snail-763.convex.site/stripe/connect/callback
```

3. Zorg dat OAuth in live echt enabled wordt
4. Kopieer daarna de live `client_id`

Als `Live client ID` daarna nog steeds `Unavailable` blijft, dan is dit een Stripe account/platform gating issue en moet je in Stripe support of de setup guide kijken welk live step nog openstaat.

### 2. Zet de juiste live env vars in Convex

Je production deployment moet minimaal hebben:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_CONNECT_CLIENT_ID=ca_...
CONVEX_SITE_URL=https://quirky-snail-763.convex.site
SITE_URL=https://getstage.co
```

Zie ook:

- [2026-03-09-production-setup.md](/Users/wernerjohannesdieben/stage_mvp/docs/2026-03-09-production-setup.md)

### 3. Deploy production opnieuw

Na env updates:

```bash
npx convex deploy --env-file .env.prod
```

### 4. Test live met een apart Stripe account

Gebruik niet dezelfde Stripe account als je platform-owner account.

Test:

1. login in Stage
2. `Settings > Integrations > Connect Stripe`
3. authorize met een andere live Stripe account
4. check of je terugkomt op:

```text
https://getstage.co/settings?tab=integrations
```

5. klik `Sync data`

---

## Wat je waarschijnlijk fout doet

Waarschijnlijk één of meer van deze:

- je denkt dat test Connect setup automatisch doorloopt naar live
- live redirect URI is niet toegevoegd
- live `STRIPE_CONNECT_CLIENT_ID` staat niet in Convex
- live Stripe platform is nog niet volledig geactiveerd voor OAuth

De screenshot wijst vooral op de eerste en vierde.

---

## Wat je daarna nog in code moet fixen

Zelfs als live OAuth straks werkt, is Stripe Connect nog niet helemaal product-af.

### Nog open in code

1. **Disconnect deauthorize ontbreekt**
   In [stripeConnect.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/stripeConnect.ts#L502) zet je nu alleen lokaal `status = disconnected`.
   Je roept nog niet Stripe `oauth/deauthorize` aan.

2. **Connect webhook handling ontbreekt**
   Je hebt wel `/stripe/webhook`, maar die route gaat nu alleen naar het Stripe billing component in [http.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/http.ts#L1).
   Er is nog geen eigen handling voor:
   - `account.application.deauthorized`
   - `account.updated`

3. **Dashboard telt waarschijnlijk dubbel**
   Je schrijft zowel invoice-entries als payment-entries naar `financeEntries`, en het dashboard telt alles met `status = paid` op in [dashboardOverview.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/readmodels/dashboardOverview.ts#L47).

4. **Sync heeft nog geen pagination**
   Nu alleen eerste 100 invoices en 100 charges in [stripeConnect.ts](/Users/wernerjohannesdieben/stage_mvp/app/convex/stripeConnect.ts#L615).

5. **OAuth redirect feedback lijkt opnieuw stuk**
   De callback zet `?stripe=connected` en `?stripe=error`, maar de nieuwe settings hooks lezen die params niet meer uit.

---

## Mijn advies: niet opnieuw ontwerpen

Niet nu alles omgooien naar een andere Connect architectuur.

Voor nu is de juiste route:

1. live OAuth in Stripe dashboard fixen
2. live env vars fixen
3. live connect test laten slagen
4. daarna lifecycle fixes doen:
   - deauthorize
   - connect webhooks
   - dashboard counting fix

Dat is de snelste weg naar “Stripe Connect echt af”.

---

## Official Stripe docs

- [Using OAuth with Standard accounts](https://docs.stripe.com/connect/oauth-standard-accounts)
- [Connect OAuth reference](https://docs.stripe.com/connect/oauth-reference)
- [Using Connect with Standard connected accounts](https://docs.stripe.com/connect/standard-accounts)
- [Making API calls for connected accounts](https://docs.stripe.com/connect/authentication)
- [Connect webhooks](https://docs.stripe.com/connect/webhooks)
- [Testing Stripe Connect](https://docs.stripe.com/connect/testing)
- [Go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

---

## One-line diagnosis

**Live OAuth werkt nu waarschijnlijk niet omdat je live Stripe Connect platform nog geen actieve live OAuth client + redirect URI configuratie heeft, en daardoor kan Stage geen geldige live Connect authorize flow starten.**
