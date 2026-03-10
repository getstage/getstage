# Stripe Connect — Compleet Overzicht & Plan

## Wat is Stripe Connect eigenlijk?

Stripe Connect is een systeem waarmee jouw platform (Stage) toegang krijgt tot de Stripe accounts van andere mensen (jouw freelancers/gebruikers). Het is **niet** hetzelfde als Stripe Billing (waarmee je je eigen klanten factureert).

**Jouw use case:** Een freelancer die Stage gebruikt heeft al een eigen Stripe account waar ze facturen en betalingen in hebben. Stage wilt die data **lezen** (invoices, payments) zodat de freelancer alles op één plek ziet.

### De 3 soorten Stripe Connect accounts

| Type | Wie beheert het? | Wanneer gebruiken? |
|---|---|---|
| **Standard** ← dit gebruik jij | De freelancer zelf | Freelancer heeft al een Stripe account |
| Express | Mix | Marketplace waar je uitbetaalt aan verkopers |
| Custom | Jouw platform | Volledig white-label betalingen |

**Standard** is juist voor Stage omdat:
- Freelancers hebben al een Stripe account
- Je wilt alleen hun data lezen, niet namens hen betalen
- Ze houden hun eigen Stripe dashboard

---

## Hoe de OAuth flow werkt (stap voor stap)

```
1. Freelancer klikt "Connect Stripe" in Stage
   │
2. Stage backend (startConnect) doet:
   ├── Maakt random state token (tegen CSRF attacks)
   ├── Slaat pending connection op in database
   └── Geeft URL terug: https://connect.stripe.com/oauth/authorize?
         client_id=ca_xxx          ← jouw platform ID
         response_type=code        ← we willen een auth code
         scope=read_write          ← toegang tot hun data
         state=random_token        ← security check
         redirect_uri=xxx/callback ← waar Stripe de user terugstuurt
   │
3. Freelancer komt op Stripe's pagina
   ├── Logt in met hun Stripe account (of maakt er een)
   └── Klikt "Authorize" om Stage toegang te geven
   │
4. Stripe redirect naar jouw callback URL met:
   ├── ?code=ac_xxx    ← authorization code (tijdelijk)
   └── ?state=xxx      ← zelfde state token als stap 2
   │
5. Stage backend (connectCallback) doet:
   ├── Checkt of state token klopt (CSRF bescherming)
   ├── POST naar connect.stripe.com/oauth/token met de code
   │   └── Krijgt terug: stripe_user_id (acct_xxx)
   ├── Haalt account details op (naam, email, status)
   ├── Slaat alles op in database (paymentConnections tabel)
   └── Redirect freelancer naar /settings?tab=integrations&stripe=connected
   │
6. Freelancer is terug in Stage en ziet "Connected ✓"
```

### Waarom `ca_xxx` (Client ID)?
Dit is het **platform ID** van Stage bij Stripe. Als een freelancer de OAuth flow doorloopt, weet Stripe door dit ID dat het Stage is die toegang vraagt. Elke Stripe Connect platform heeft er eentje. Je vindt het in:
**Stripe Dashboard → Settings → Connect → Onboarding options → OAuth tab**

### Waarom `sk_test_xxx` (Secret Key)?
Dit is je gewone Stripe API key. Na de OAuth flow gebruik je deze + de `stripe_user_id` van de connected account om hun data op te halen. Zo:
```
stripe.invoices.list({ limit: 100 }, { stripeAccount: "acct_xxx" })
```
De `stripeAccount` header vertelt Stripe: "haal data op namens dit connected account."

### Waarom de redirect URI?
Na stap 3 (freelancer klikt Authorize) moet Stripe weten waar het de user terugstuurt. Die URL moet **exact** matchen met wat je in het Stripe dashboard hebt ingesteld. In jouw geval:
```
https://reliable-bullfrog-917.convex.site/stripe/connect/callback
```

---

## Hoe sync werkt

```
1. Freelancer klikt "Sync data" in Stage
   │
2. Stage backend (syncStripeData) doet:
   ├── Zoekt de connection op in database
   ├── Pakt de stripe_user_id (acct_xxx)
   ├── Haalt account info op via Stripe API
   ├── Haalt invoices op (max 100)
   ├── Haalt charges/payments op (max 100)
   ├── Mapt alles naar Stage's database schema
   └── Slaat op in invoices + payments + financeEntries tabellen
   │
3. Frontend toont: "Imported X invoices and Y payments"
```

---

## Wat is er al gebouwd (alles werkt al)

| Component | File | Status |
|---|---|---|
| OAuth flow (start → callback) | `convex/stripeConnect.ts` lines 528-755 | ✅ Klaar |
| Data sync (invoices + payments) | `convex/stripeConnect.ts` lines 597-673 | ✅ Klaar |
| Disconnect functie | `convex/stripeConnect.ts` lines 502-526 | ✅ Klaar |
| Connection status query | `convex/stripeConnect.ts` lines 145-171 | ✅ Klaar |
| HTTP callback route | `convex/http.ts` line 12-16 | ✅ Klaar |
| Database schema | `convex/schema.ts` lines 260-380 | ✅ Klaar |
| Settings UI (Connect/Sync/Disconnect) | `src/components/settings/IntegrationsTab.tsx` | ✅ Klaar |

## Stripe Dashboard setup

| Stap | Status |
|---|---|
| Connect platform aangemaakt | ✅ |
| OAuth enabled | ✅ |
| Client ID (`ca_xxx`) in Convex env vars | ✅ |
| Redirect URI ingesteld | ✅ |
| `STRIPE_SECRET_KEY` in Convex env vars | ✅ |
| `SITE_URL` in Convex env vars | ✅ |
| `CONVEX_SITE_URL` in Convex env vars | ✅ |

---

## Wat moet nog gefixt worden (3 kleine dingen)

### Fix 1: Callback redirect gaat naar verkeerde tab
**File:** `app/convex/stripeConnect.ts` — line 678

De `connectCallback` stuurt de user na OAuth terug naar `?tab=billing`, maar de Stripe Connect UI zit in de **Integrations** tab.

**Aanpassing:**
```
// Line 678, verander:
redirectUrl.searchParams.set("tab", "billing");
// Naar:
redirectUrl.searchParams.set("tab", "integrations");
```

### Fix 2: Success/error feedback na OAuth redirect
**File:** `app/src/components/settings/SettingsPage.tsx` — rond line 155

De callback zet `?stripe=connected` of `?stripe=error` in de URL, maar het frontend leest deze parameters niet uit. De freelancer ziet dus niks na het connecten.

**Aanpassing:**
- In de bestaande `useEffect` die al de `tab` param leest: ook de `stripe` param uitlezen
- `stripe=connected` → toon success feedback ("Stripe account successfully connected!")
- `stripe=error` → toon error feedback ("Something went wrong connecting Stripe. Try again.")
- Verwijder de `stripe` param uit de URL na het lezen (zodat een page refresh niet opnieuw triggert)

### Fix 3: Disconnect confirmation
**File:** `app/src/components/settings/IntegrationsTab.tsx` — rond line 177

De Disconnect knop disconnectt direct zonder bevestiging. Eén klik en je data sync is weg.

**Aanpassing:**
- Voeg een `window.confirm()` of bestaande modal toe voor de Disconnect knop
- Tekst: "This will stop syncing your invoices and payments from Stripe. Are you sure?"
- Alleen als de user bevestigt → `onStripeDisconnect()` aanroepen

---

## Bestanden die gewijzigd worden

| File | Wat | Omvang |
|---|---|---|
| `app/convex/stripeConnect.ts` (line 678) | Fix redirect tab param | 1 regel |
| `app/src/components/settings/SettingsPage.tsx` (~line 155) | Lees stripe param, toon feedback | ~15 regels |
| `app/src/components/settings/IntegrationsTab.tsx` (~line 177) | Disconnect confirmation | ~5 regels |

---

## Test plan

1. **Test Connect flow:**
   - Ga naar Settings → Integrations → klik "Connect Stripe"
   - Doorloop de Stripe OAuth flow (gebruik een test account)
   - ✓ Je moet landen op Settings met **Integrations** tab open (niet Billing)
   - ✓ Je moet een success message zien

2. **Test Sync:**
   - Klik "Sync data"
   - ✓ Je moet een "Imported X invoices and Y payments" message zien

3. **Test Disconnect:**
   - Klik "Disconnect"
   - ✓ Er moet een bevestiging popup komen
   - ✓ Alleen na bevestiging wordt de connectie verbroken

4. **Test error case:**
   - Ga direct naar `/settings?tab=integrations&stripe=error`
   - ✓ Je moet een error message zien

---

## Begrippen cheat sheet

| Term | Wat het is |
|---|---|
| `ca_xxx` (Client ID) | Jouw platform's ID bij Stripe Connect |
| `sk_test_xxx` (Secret Key) | Jouw Stripe API key |
| `acct_xxx` (Connected Account ID) | De Stripe account ID van een freelancer die connected is |
| `ac_xxx` (Authorization Code) | Tijdelijke code na OAuth, wordt omgewisseld voor account ID |
| Standard Account | Type connected account — freelancer beheert eigen Stripe |
| OAuth | Het autorisatie protocol — freelancer geeft Stage toestemming |
| Webhook | Stripe stuurt events naar jouw server (bv. "account disconnected") |
| `CONVEX_SITE_URL` | URL van je Convex backend (`xxx.convex.site`) |
| `SITE_URL` | URL van je frontend app (`testing.getstage.co`) |

---

## Environment variables

| Variable | Waar | Beschrijving |
|---|---|---|
| `STRIPE_SECRET_KEY` | Convex env | Je Stripe secret key (sk_live_... of sk_test_...) |
| `STRIPE_CONNECT_CLIENT_ID` | Convex env | Connect OAuth client ID (ca_...) |
| `CONVEX_SITE_URL` | Convex env | Je Convex deployment URL (voor OAuth callback) |
| `SITE_URL` | Convex env | Je app URL (voor redirect na OAuth) |

## Key files

| File | Wat het doet |
|---|---|
| `convex/stripeConnect.ts` | Alle backend logic: OAuth, sync, queries |
| `convex/schema.ts` (lines 260-380) | Database tabellen voor payments/invoices |
| `convex/http.ts` | HTTP routes voor webhook + OAuth callback |
| `src/components/settings/IntegrationsTab.tsx` | Frontend UI voor Connect/Sync/Disconnect |
| `src/components/settings/SettingsPage.tsx` | Wires up actions + state management |

---

## Toekomstige verbeteringen

1. **Webhook handler voor `account.application.deauthorized`** — als een user Stage disconnect vanuit hun Stripe dashboard, moet Stage dit weten. Endpoint bestaat al op `/stripe/webhook` maar er zijn nog geen event handlers aangesloten.
2. **Pagination voor grote accounts** — nu gelimiteerd tot 100 invoices/charges. Freelancers met veel history missen oudere data.
3. **Rate limiting op sync** — cooldown toevoegen (bv. 1 sync per 5 minuten) om Stripe API limits te voorkomen.
