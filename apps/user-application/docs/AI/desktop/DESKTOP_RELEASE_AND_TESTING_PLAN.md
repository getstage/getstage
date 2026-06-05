# Desktop testen & eerste release — plan

> **Status:** actief plan (juni 2026)  
> **Scope:** `apps/user-application` (Electron), auth-bridge via `apps/web-application`, Convex `packages/data-ops`  
> **Gerelateerd:** [`../05-09/05-09-auth-and-step-23-summary.md`](../05-09/05-09-auth-and-step-23-summary.md), [`../05-09/05-09-desktop-auth-deep-link-plan.md`](../05-09/05-09-desktop-auth-deep-link-plan.md)

---

## Open prioriteit

| Item | Doc |
|------|-----|
| **Startup-tijd moet veel beter** — trage cold start is geen acceptabele launch-ervaring | [`DESKTOP_STARTUP_PERFORMANCE.md`](./DESKTOP_STARTUP_PERFORMANCE.md) |
| **Hele app te traag** — trage klikken, te veel fetches, chat `fetch failed`, geen logs | [`DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md`](./DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md) |

---

## Kort antwoord

| Vraag | Antwoord |
|--------|----------|
| **Kunnen we nu bouwen en testen?** | **Ja** — met `pnpm desktop:dev` op je Mac. Geen Apple Developer nodig. |
| **Kunnen we nu een DMG naar klanten sturen?** | **Beperkt** — unsigned DMG kan, maar macOS blokkeert/waarschuwt. Voor serieuze klant-test: Apple ID of alleen jullie eigen machines. |
| **Moet Apple Developer vóór eerste test?** | **Nee.** Alleen vóór “download van website/GitHub zonder gedoe”. |

---

## Drie fases (wat wanneer)

```txt
Fase A — Dev-test (NU)          → geen Apple, geen DMG nodig
Fase B — Packaged smoke test    → optioneel lokaal, nog steeds geen Apple voor intern
Fase C — Klant / publiek DMG    → Apple Developer ID + notarisatie + CI (Synara-model)
```

---

## Fase A — Nu testen (aanbevolen start)

### Wat je nodig hebt

1. **Terminal 1:** Convex  
   `cd packages/data-ops && npx convex dev`

2. **Terminal 2:** Desktop  
   `cd apps/user-application && pnpm dev`  
   (bouwt automatisch `data-ops` + Rust sidecar)

3. **Web auth** moet bereikbaar zijn op **testing**:  
   `https://testing.getstage.co` (standaard in dev — zie `electron/helpers/auth.ts`)

4. Optioneel **Terminal 3:** web-app lokaal alleen als je web-routes zelf debugt; voor desktop-auth volstaat deployed testing.

### Auth-flow (dev)

```txt
Electron (niet packaged)
  → opent browser: testing.getstage.co/auth/desktop?redirect_uri=http://127.0.0.1:48224/auth&state=...
  → niet ingelogd → /auth met desktop_redirect_uri + desktop_state
  → inloggen (OTP of Google)
  → terug naar /auth/desktop → JWT handoff
  → localhost callback (48224) → Electron sessie
```

**Niet** verwachten dat je na login op het **web-dashboard** blijft — dat is fout gedrag. Je hoort op `/auth/desktop` te landen en daarna terug in Electron te zitten.

### Checklist Fase A

- [ ] `curl http://127.0.0.1:48221/v1/readiness` → `ready: true`
- [ ] Desktop start zonder crash; uitgelogd → sign-in scherm
- [ ] Login opent browser op **testing.getstage.co** (niet per ongeluk alleen getstage.co/auth zonder desktop-params)
- [ ] Na login: Electron toont echte user (geen `desktop-dev-user`)
- [ ] Project laden via sidecar/API werkt
- [ ] Logout → weer sign-in scherm
- [ ] (Feature-specifiek) zie `RESEARCH_TESTING.md`, `STRATEGY_TESTING.md`, `FLOWS_TESTING.md`, `MOODBOARD_TESTING.md`

### Bekende valkuilen (auth → dashboard)

| Symptoom | Waarschijnlijke oorzaak |
|----------|-------------------------|
| Na login **web dashboard** i.p.v. Electron | Inloggen via `/auth` zonder `desktop_redirect_uri` / `desktop_state`; of Google OAuth verliest redirect; of `SITE_URL` in Convex ≠ hostname van testing |
| Handoff faalt stil | Browser blokkeert POST naar `127.0.0.1:48224`; Electron niet gestart; verkeerde `state` |
| API 401 na login | Token niet opgeslagen; verkeerde API base URL |

**Debug:** browser-URL na login moet `/auth/desktop?...` bevatten. Convex `SITE_URL` moet matchen met `https://testing.getstage.co` als je tegen testing test.

---

## Fase B — Packaged build lokaal (optioneel, vóór Apple)

**Doel:** controleren of `electron-vite build` + preview gedrag lijkt op productie, zonder DMG te shippen.

### Huidige tooling

- `pnpm --filter stage-user-application run build` → compileert main/preload/renderer
- `pnpm --filter stage-user-application run preview` → packaged-achtige run (nog **geen** `electron-builder`, **geen** DMG in repo)

### Wat nog ontbreekt in repo (bewust later)

- `electron-builder` config
- GitHub Actions release workflow
- `latest-mac.yml` voor auto-update
- Code sign + notarize scripts

### Fase B taken (engineering)

1. [ ] `build` + `preview` op schone Mac — app start, auth URL = production default (`getstage.co`) tenzij `STAGE_DESKTOP_AUTH_URL` gezet
2. [ ] `stage://auth` protocol na packaged preview (anders dan dev localhost callback)
3. [ ] Env/productie-API URLs (`PRODUCTION_DESKTOP_API_URL` in helpers) kloppen met deployed Convex + web

**Apple:** nog steeds niet verplicht voor Fase B op **eigen** machine (Rechtsklik → Open bij Gatekeeper).

---

## Fase C — Release DMG + GitHub (Synara-stijl)

Doel: tag `v0.1.0` → GitHub Actions → **Stage-0.1.0-arm64.dmg** + **Stage-0.1.0-x64.dmg** + `latest-mac.yml` → GitHub Releases.

### Stap 1 — Apple (klant-account aanbevolen)

1. [ ] Inschrijven [Apple Developer Program](https://developer.apple.com/programs/) ($99/jaar) op **bedrijfsnaam klant**
2. [ ] **Certificates, Identifiers & Profiles** → **Developer ID Application** aanmaken
3. [ ] Certificaat downloaden en in **Keychain Access** op de build-Mac zetten
4. [ ] (Optioneel) **Developer ID Installer** voor PKG; voor DMG vaak alleen Application cert
5. [ ] App-specific password voor notarisatie: [appleid.apple.com](https://appleid.apple.com) → App-specific passwords
6. [ ] Team ID noteren (Membership details)

### Stap 2 — Repo: electron-builder

1. [ ] `electron-builder` + `electron-updater` als devDependencies in `apps/user-application`
2. [ ] `electron-builder.yml` (of `build` block in `package.json`):
   - `appId`: bijv. `co.getstage.desktop`
   - `productName`: `Stage`
   - `mac.target`: `dmg` (targets: `arm64`, `x64` of `universal`)
   - `publish`: `github` (owner/repo van **klant** of jullie org)
3. [ ] Scripts: `"dist:mac": "electron-vite build && electron-builder --mac"`
4. [ ] Icon `.icns`, entitlements plist (microfoon/scherm indien nodig later)
5. [ ] Lokaal **een keer** unsigned build testen; daarna signed + `notarize: true`

### Stap 3 — Signing & notarisatie (env op CI)

| Secret / var | Gebruik |
|--------------|---------|
| `APPLE_ID` | Apple ID e-mail |
| `APPLE_APP_SPECIFIC_PASSWORD` | Notarisatie |
| `APPLE_TEAM_ID` | Team ID |
| `CSC_LINK` | Base64 `.p12` Developer ID cert |
| `CSC_KEY_PASSWORD` | Wachtwoord p12 |
| `GH_TOKEN` | GitHub release upload (fine-grained of classic met `contents: write`) |

Lokaal kan hetzelfde via Keychain i.p.v. `CSC_LINK`.

### Stap 4 — GitHub Actions workflow

Nieuw bestand bijv. `.github/workflows/release-desktop.yml`:

```yaml
# Trigger: push tag v*
# Jobs: checkout → pnpm install → build data-ops + stage-engine + electron-vite
#       → electron-builder --mac --publish always
# Artifacts op Release: *.dmg, *.blockmap, latest-mac.yml
```

Checklist:

1. [ ] Runner: `macos-latest` (Apple build **moet** op macOS)
2. [ ] Rust sidecar meebuilden in workflow (`cargo build --release`)
3. [ ] Convex/productie-URL’s in build-time env (geen `testing` in packaged default)
4. [ ] Tag `v0.1.0` pushen → Release draft/public met assets

### Stap 5 — Web & auth (productie)

1. [ ] Convex env: `SITE_URL=https://getstage.co` (en optioneel `STAGE_TESTING_SITE_URL=https://testing.getstage.co`)
2. [ ] Deploy web naar productie vóór eerste DMG
3. [ ] Google OAuth redirect URIs: `https://getstage.co` + callback paths van Convex Auth
4. [ ] Packaged app: `getstage.co/auth/desktop` + `stage://auth` protocol (geen localhost callback)

### Stap 6 — Downloadpagina

1. [ ] Landingspagina `/download` of hero CTA: **Download for Mac (Apple Silicon)** / **Intel**
2. [ ] Links naar GitHub Release assets (of CDN mirror)
3. [ ] Geen DMG op `/auth/desktop` — alleen “Terug naar Stage Desktop…”

### Stap 7 — Eerste release uitvoeren

```bash
git tag v0.1.0
git push origin v0.1.0
# → CI maakt Release; controleer DMG op schone Mac (niet je dev-machine met Gatekeeper uit)
```

### Vereisten (samenvatting)

| Item | Wie regelt |
|------|------------|
| Apple Developer Program | **Klant** (aanbevolen) |
| GitHub repo + `GH_TOKEN` | Jullie / klant |
| electron-builder + workflow | Engineering |
| Downloadpagina | Web |

**Auth-pagina toont geen DMG** — alleen handoff naar `stage://auth`.

---

## Wat je vandaag wél / niet moet doen

### Wél (testen)

```bash
cd packages/data-ops && npx convex dev
# nieuwe terminal:
cd apps/user-application && pnpm dev
```

Daarna in Electron: inloggen en features doorlopen volgens de feature-testing docs in deze map.

### Niet nu blokkeren op

- Apple Developer aanvragen (tenzij klant **nu** DMG naar 10+ externe Macs wil)
- App Store listing
- Volledige CI release pipeline (kan parallel na eerste handmatige test)

### Wel parallel vastleggen (klantgesprek)

- Wie wordt **legal entity** op Apple Developer account?
- Testen tegen **testing** of **production** Convex/web?
- Minimale macOS-versie en Apple Silicon-only vs ook Intel

---

## Auth-fix (desktop → niet meer dashboard)

**Geïmplementeerd (juni 2026):**

- Web: `buildDesktopAuthHandoffUrl()` → absolute URL op huidige origin (`testing` vs `getstage`)
- Convex: `redirectAfterSignIn` accepteert `/auth/desktop` + meerdere hosts (`SITE_URL`, `STAGE_TESTING_SITE_URL`, defaults)
- Pending redirect wordt vroeg opgeslagen vóór Google OAuth

**Convex env (deploy na code):**

```bash
SITE_URL=https://getstage.co
STAGE_TESTING_SITE_URL=https://testing.getstage.co
# optioneel: STAGE_ALLOWED_SITE_URLS=https://stage.getstage.co,https://localhost:5173
```

**Test:**

1. Electron → Sign in
2. Na login: URL = `…/auth/desktop?redirect_uri=…&state=…` (niet `/dashboard`)
3. Electron opent met sessie

Zie: `packages/data-ops/convex/auth.ts`, `apps/web-application/src/lib/desktopAuthRedirect.ts`, `AuthPage.tsx`, `auth.desktop.tsx`

---

## Volgorde van werk (aanbevolen)

```txt
1. Fase A auth + 1 feature (bijv. Research) groen op testing
2. Auth dashboard-bug fixen als die nog speelt (SITE_URL + redirect params)
3. Fase B preview build op 1 Mac
4. Klant: Apple account + Fase C pipeline
5. Downloadpagina + eerste GitHub Release v0.1.0
```

---

## Verificatie-commando’s

```bash
pnpm --dir packages/data-ops run typecheck
pnpm --filter stage-user-application run typecheck
pnpm --filter stage-user-application run build
pnpm --filter web-application run build:testing   # als web/auth mee-test
curl -s http://127.0.0.1:48221/v1/readiness | head
```

---

## Samenvatting in één zin

**Ja, nu bouwen en testen in dev; Apple is alleen nodig zodra je een DMG naar willekeurige klant-Macs wilt sturen zonder macOS-waarschuwingen — niet voor dagelijks ontwikkelen op je eigen machine.**
