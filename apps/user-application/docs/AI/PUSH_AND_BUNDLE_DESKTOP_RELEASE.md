# Pushen en bundelen van Stage Desktop

Gebruik dit document als checklist voor de eerste GitHub Release met DMG.

## 1. Check lokaal

```bash
pnpm --filter @stage/data-ops run build
pnpm --filter stage-user-application run typecheck
cargo check --manifest-path apps/stage-engine/Cargo.toml
pnpm --filter stage-user-application run build
```

Status op 2026-06-04:
- `@stage/data-ops` build: groen
- `stage-user-application` typecheck: groen
- `stage-engine` cargo check: groen, alleen bestaande dead-code warnings
- `stage-user-application` build: groen

## 2. Vereiste GitHub secrets

Repo: `getstage/getstage` -> Settings -> Secrets and variables -> Actions.

Verplicht voor elke DMG-build:

```text
DESKTOP_VITE_CONVEX_URL=https://<testing-of-prod>.convex.cloud
```

Voor signed + notarized DMG:

```text
APPLE_ID=<apple-id-email>
APPLE_TEAM_ID=<team-id>
APPLE_APP_SPECIFIC_PASSWORD=<app-specific-password>
CSC_LINK=<base64-van-p12>
CSC_KEY_PASSWORD=<p12-wachtwoord>
```

Voor Refero vanaf dag 1:

```text
REFERO_MCP_TOKEN=<refero-token>
```

Let op: als Refero lokaal in `stage-engine` draait, moet de token lokaal beschikbaar komen. Voor launch accepteren we dit praktisch; later hoort dit server-side.

## 3. Apple certificaat afronden

Als je nog in Apple Developer bij upload zit:

1. Upload de `.certSigningRequest` CSR.
2. Download de `.cer`.
3. Dubbelklik de `.cer`.
4. Open Keychain Access -> `login` -> `My Certificates`.
5. Zoek `Developer ID Application: ...`.
6. Rechtsklik -> Export -> `.p12`.
7. Zet `.p12` om naar base64:

```bash
base64 -i /pad/naar/certificaat.p12 | pbcopy
```

8. Plak de clipboard waarde in GitHub secret `CSC_LINK`.
9. Het export-wachtwoord van de `.p12` is `CSC_KEY_PASSWORD`.

## 4. Alles committen

De gebruiker wil voor deze release alles meenemen:

```bash
git status --short
git add .
git commit -m "Prepare desktop release build"
```

Als Git zegt dat er niets te committen is, ga door naar taggen.

## 5. Tag maken

Gebruik semver tag. Eerste release:

```bash
git tag v0.1.0
```

Als `v0.1.0` al bestaat:

```bash
git tag
git tag v0.1.1
```

## 6. Pushen

```bash
git push origin work
git push origin v0.1.0
```

Of bij andere tag:

```bash
git push origin v0.1.1
```

De tag start automatisch `.github/workflows/release-desktop.yml`.

## 7. GitHub Actions controleren

Ga naar:

```text
GitHub -> Actions -> Release Stage Desktop (macOS)
```

Verwacht:
- job `macOS arm64`
- job `macOS x64`
- beide maken een `.dmg`
- bij tag push worden assets naar GitHub Releases gepubliceerd

## 8. DMG downloaden

Ga naar:

```text
GitHub -> Releases -> v0.1.0
```

Gebruik:
- Apple Silicon Mac: `arm64.dmg`
- Intel Mac: `x64.dmg`

## 9. Testflow

1. Download DMG.
2. Open app.
3. Login vanuit Electron.
4. Browser gaat naar `/auth/desktop`.
5. App krijgt sessie terug.
6. Check project dashboard.
7. Start Research of Moodboard en check dat Refero werkt.
8. Check dat artifacts/images in Convex/R2 worden opgeslagen.

## 10. Als de workflow faalt

Veelvoorkomend:

```text
Missing DESKTOP_VITE_CONVEX_URL
```

Fix: GitHub secret zetten.

```text
Code signing failed / certificate not found
```

Fix: `CSC_LINK` moet base64 van `.p12` zijn, niet de `.cer`.

```text
Notarization failed
```

Fix: check `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_SPECIFIC_PASSWORD`.

```text
Refero not configured
```

Fix: `REFERO_MCP_TOKEN` zetten waar de release hem verwacht, of tijdelijk lokaal `.env` gebruiken.
