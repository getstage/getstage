# Stage Desktop release — stappenplan (Synara-stijl)

Repo: `getstage/getstage` · Workflow: `.github/workflows/release-desktop.yml`

---

## Wat is er gebouwd

- **electron-builder** → DMG (arm64 + x64 via CI matrix)
- **GitHub Actions** → bij tag `v*` → assets op GitHub Releases
- **Packaged stage-engine** → Rust binary in `resources/`, geen `cargo run` in productie
- **Unsigned fallback** → zonder Apple-secrets toch DMG (partner test: Rechtsklik → Open)

---

## App Store Connect vs Apple Developer — niet verwarren

| Waar je nu bent (screenshot) | Wat het is |
|------------------------------|------------|
| **App Store Connect → Users** | Teamleden, rollen (Account Holder) — **geen certificaten** |
| **developer.apple.com → Certificates** | Hier maak je het **.p12** certificaat |

Je hoeft **geen app** in App Store Connect aan te maken voor een DMG buiten de Store.

---

## Apple: .p12 stap voor stap (op je Mac)

### A. Lidmaatschap

1. [developer.apple.com/account](https://developer.apple.com/account) → inloggen  
2. Als **Membership Expired** → **Renew** (Account Holder = jij)

### B. Certificaat aanmaken (website)

1. Ga naar **[Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list)**  
   (niet App Store Connect)
2. Klik **+** (nieuw certificaat)
3. Kies **Developer ID Application**  
   - **Niet** “Apple Distribution” (dat is App Store)  
   - **Niet** “Mac Development” alleen (dat is dev)
4. Op je Mac: **Keychain Access** → menu **Certificate Assistant** → **Request a Certificate From a Certificate Authority**  
   - e-mail invullen, **Saved to disk** → `.certSigningRequest` bestand
5. Upload dat CSR-bestand op de Apple-site → **Continue** → **Download** `.cer`
6. Dubbelklik `.cer` → komt in **login** keychain

### C. .p12 exporteren (Keychain op Mac)

1. Open **Keychain Access** (Sleutelhangprogramma)
2. Links: **login** → categorie **My Certificates** / **Mijn certificaten**
3. Zoek **Developer ID Application: …** (jouw naam/team)
4. **Pijltje openklappen** → je moet **certificaat + private key** zien
5. Selecteer **beide** → rechtsklik → **Export …** → formaat **.p12** → wachtwoord kiezen (onthouden voor GitHub secret)

### D. Naar GitHub Secrets

| Secret | Waarde |
|--------|--------|
| `APPLE_ID` | `wesseldieben01@gmail.com` (jouw Apple ID) |
| `APPLE_TEAM_ID` | `V46CUNBUS4` (staat op je Users-pagina) |
| `APPLE_APP_SPECIFIC_PASSWORD` | [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords → genereer “GitHub Stage” |
| `CSC_LINK` | Terminal: `base64 -i ~/Downloads/cert.p12 \| pbcopy` → plak in secret |
| `CSC_KEY_PASSWORD` | Wachtwoord dat je bij export koos |

**Zonder stappen B–D:** CI bouwt nog steeds een **unsigned** DMG (test met Rechtsklik → Open).

---

## Jouw stappen (nu)

### 1. Apple (jouw account, voor signed DMG)

1. [developer.apple.com](https://developer.apple.com) → lidmaatschap **verlengen**
2. App Store Connect → **agreements** accepteren (Account Holder)
3. **Developer ID Application** certificaat → export als `.p12`

### 2. GitHub Secrets (`getstage/getstage` → Settings → Secrets)

| Secret | Verplicht | Waarde |
|--------|-----------|--------|
| `DESKTOP_VITE_CONVEX_URL` | **Ja** | **Testing:** `https://reliable-bullfrog-917.convex.cloud` (jouw dev deployment) |
| Repository variable `STAGE_DESKTOP_AUTH_URL` | Optioneel | Default in CI: `https://testing.getstage.co/auth/desktop` |
| `APPLE_ID` | Voor sign | Apple ID e-mail |
| `APPLE_APP_SPECIFIC_PASSWORD` | Voor sign | App-specific password |
| `APPLE_TEAM_ID` | Voor sign | Team ID |
| `CSC_LINK` | Voor sign | Base64 van `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `CSC_KEY_PASSWORD` | Voor sign | Wachtwoord p12 |
| `REFERO_MCP_TOKEN` | Nee | Alleen als Research in **gebouwde** app moet; liever later server-side |

Zonder Apple-secrets: CI bouwt **unsigned** DMG’s (oké voor partner/klant-test).

### 3. Eerste release

```bash
# Lokaal (optioneel, op Mac):
export VITE_CONVEX_URL=https://jouw-prod.convex.cloud
cd apps/user-application
pnpm run dist:mac:arm64   # of dist:mac:x64 op Intel Mac

# Via GitHub (aanbevolen):
git add … && git commit -m "Add desktop release pipeline"
git tag v0.1.0
git push origin v0.1.0
```

→ Actions tab → **Release Stage Desktop** → 2 DMG’s op Releases.

### 4. Partner / klant laten testen

1. GitHub Release → download **arm64** (Apple Silicon) of **x64** (Intel)
2. Eerste keer unsigned: **Rechtsklik → Open** (niet dubbelklik)
3. App → Sign in → `getstage.co/auth/desktop` → terug in app
4. Web moet **prod** Convex + auth-fix deployed hebben

### 5. Daarna (niet nu blokkerend)

- [ ] Downloadpagina op getstage.co
- [ ] `electron-updater` + `latest-mac.yml`
- [ ] Refero token server-side
- [ ] Apple-account naar klant verplaatsen

---

## Lokaal bouwen (zonder CI)

```bash
export VITE_CONVEX_URL=https://jouw-prod.convex.cloud
pnpm install
pnpm --filter stage-user-application run dist:mac:arm64
# DMG in apps/user-application/release/
```

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| CI faalt op `DESKTOP_VITE_CONVEX_URL` | Secret zetten in GitHub |
| DMG opent niet | Unsigned → Rechtsklik → Open; of Apple secrets + signed build |
| Geen Research in DMG | `REFERO_MCP_TOKEN` zit niet in client-build by design |
| Engine start niet | Check `resources/stage-engine/stage-engine` in CI logs |
| Auth werkt niet in DMG | Prod deploy web + Convex; login via Electron |

---

## Workflow handmatig (zonder tag)

Actions → **Release Stage Desktop** → **Run workflow** → `publish_release: false` → artifacts in run (geen Release page).
