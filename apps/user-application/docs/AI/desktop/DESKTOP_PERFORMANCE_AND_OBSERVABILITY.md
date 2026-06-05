# Desktop performance & observability — open issues

> **Status:** open, **zeer hoge prioriteit** (juni 2026)  
> **Scope:** traagheid, te veel fetches, engine errors, geen zichtbare logs  
> **Gerelateerd:** [`DESKTOP_STARTUP_PERFORMANCE.md`](./DESKTOP_STARTUP_PERFORMANCE.md)

---

## Samenvatting (product)

**De hele app voelt te traag.** Klikken reageert traag. Dit is geen acceptabele desktop-ervaring en moet structureel beter — naast startup-tijd, fetch-patronen, engine-betrouwbaarheid en logging.

---

## v0.1.49 — wat is gefixt (juni 2026)

| Change | Bestand | Effect |
|--------|---------|--------|
| Engine-badge + 2s-polling van dashboard verwijderd | `DashboardContextView.tsx`, `useEngineStatus.ts` | Minder IPC/localhost-verkeer tijdens normaal gebruik |
| `useEngineStatus` standaard uit (`enabled: false`) | `useEngineStatus.ts` | Alleen ophalen wanneer AI/engine UI het expliciet nodig heeft |
| Provider-poll elke 10s → 5 min cache | `useProviderStatus.ts` | Minder engine-calls op research/strategy/integrations |
| Onnodige `active-app` query op dashboard weg | `DashboardContextView.tsx` | Eén fetch minder bij elk dashboard-bezoek |
| Engine-status health check | `sidecar.ts` → `getLiveStatus()`, `ipc.ts` | UI kan niet meer “Engine ready” tonen als poort 48221 dood is |

Nog open: startup-tijd, log-map in app, betere chat-fouttekst, bundle size.

---

## Debuggen (stap voor stap)

### 1. Draait stage-engine?

```bash
curl -s http://127.0.0.1:48221/v1/readiness
```

- **JSON met `"ready": true`** → engine OK
- **`Couldn't connect`** → engine draait niet → chat/AI faalt met `fetch failed`

### 2. Main + sidecar logs zien (aanbevolen)

Sluit Stage. Start vanuit Terminal (niet dubbelklik DMG):

```bash
/Applications/Stage.app/Contents/MacOS/Stage
```

Zoek in de output naar `[stage-engine]`. Bij crash zie je direct waarom.

Alternatief: **Console.app** → zoek `stage-engine` of `Stage` → filter op errors.

### 3. Renderer (UI, Convex, chat-errors)

In Stage: menubalk **View → Toggle Developer Tools** → tab **Console** en **Network**.

### 4. Geheugen / CPU

**Activiteitenweergave** → zoek `Stage` / `Stage Helper` / `stage-engine`.

### 5. Engine-binary in packaged app

```bash
ls -la /Applications/Stage.app/Contents/Resources/stage-engine/
```

Moet `stage-engine` executable bevatten. Ontbreekt of niet uitvoerbaar → sidecar start nooit.

### 6. Poort bezet door zombie?

```bash
lsof -i :48221
kill $(lsof -t -i:48221)   # alleen als oude engine hangt
```

---

## Hoe zie je verbruik op macOS?

### CPU / geheugen (systeem)

1. **Activiteitenweergave** openen (Spotlight → “Activity Monitor” / “Activiteitenweergave”)
2. Zoek op **Stage**
3. Let op meerdere processen:
   - `Stage` (main)
   - `Stage Helper` (renderer — vaak het zwaarste)
   - `stage-engine` (Rust sidecar)

Kolommen: **% CPU**, **Geheugen**, **Energie**.

### Netwerk / fetches (in de app)

1. In Stage: menubalk **View → Toggle Developer Tools**
2. Tab **Network** — zie HTTP/WebSocket-verkeer (Convex, localhost engine, assets)
3. Tab **Performance** — profile een trage klik

> DevTools staat ook in packaged builds (View-menu). Niet alleen in `pnpm dev`.

### Main-process + sidecar logs (nu lastig)

- **Renderer:** DevTools → Console
- **Electron main + stage-engine:** alleen zichtbaar als je Stage vanuit Terminal start, of via **Console.app** (filter op `stage-engine`, `Stage`)
- **Probleem:** bij normale DMG-start ziet de gebruiker **nergens** main/sidecar logs → moet beter (zie onder)

---

## Bekende traagheid — vermoedelijke oorzaken

| Issue | Waar | Impact |
|-------|------|--------|
| ~~Engine status elke 2s~~ | ~~`useEngineStatus` op dashboard~~ | **Fix juni 2026:** badge + polling van dashboard verwijderd; engine alleen voor AI |
| ~~Provider status elke 10s~~ | `useProviderStatus.ts` | **Fix:** geen interval meer; 5 min cache, alleen bij AI/integrations |
| ~~Active app query~~ | ~~`DashboardContextView`~~ | **Fix:** verwijderd |
| **Engine badge loog** | `getStatus()` was cache, geen health check | **Fix:** `getLiveStatus()` pingt `/v1/readiness` |
| **Zware renderer bundle** | ~3MB+ JS cold load | Trage eerste interactie |
| **Sidecar start sequentieel** | `sidecarSupervisor.start()` vóór engine-calls | Chat/AI wacht op engine |
| **Convex live queries** | meerdere `useQuery` hooks tegelijk | WebSocket + re-renders (normaal, maar stapelt) |

**Actie:** profile eerst, dan engine-poll verlagen/conditioneel maken, dashboard-queries cachen, lazy-load routes.

---

## Chat-fout: `engine:start-run` → `TypeError: fetch failed`

**Symptoom (Stage chat):**

```txt
Error invoking remote method 'engine:start-run': TypeError: fetch failed
```

**Betekenis:** Electron main kon **geen HTTP** naar de lokale sidecar (`http://127.0.0.1:48221/v1/runs`).

**Meest waarschijnlijk:**

1. `stage-engine` draait niet / is nog aan het opstarten
2. Sidecar crashed (check Console.app → `stage-engine`)
3. Request timeout te kort (`ENGINE_REQUEST_TIMEOUT_MS = 2000` in `sidecar.ts`)
4. Poort 48221 geblokkeerd of bezet

**Niet** hetzelfde als Convex-fetch — dit is **lokaal** naar Rust engine.

**Actie:**

- Toon in UI: “Engine offline” i.p.v. cryptische IPC-fout
- Wacht op readiness vóór `startRun`
- Verleng timeout voor eerste run na cold start
- Betere fouttekst in renderer (sidecar down vs auth vs provider)

---

## Logging — wat ontbreekt

| Wat | Nu | Moet |
|-----|-----|------|
| Renderer errors | Alleen via DevTools | OK, maar gebruiker weet dit niet |
| Main / IPC / auth | `console.*` → Console.app | Onzichtbaar voor eindgebruiker |
| stage-engine stdout/stderr | `sidecar.ts` → console | Zelfde probleem |
| Update checks | `[stage-update]` in main | Onzichtbaar |
| Voice / chat runs | `[stage-engine]` bij startRun | Onzichtbaar bij DMG-dubbelklik |

**Actie (backlog):**

1. **Help → Open Logs Folder** of **View → Show Logs**
2. Rotating log file in `userData/logs/`
3. Optioneel: **Developer** submenu met “Copy debug info” (versie, engine state, laatste error)

---

## Acceptatie / verbeteringen nodig

- [ ] Cold start + interactie: zie [`DESKTOP_STARTUP_PERFORMANCE.md`](./DESKTOP_STARTUP_PERFORMANCE.md)
- [x] Engine status poll niet elke 2s op idle dashboard (juni 2026)
- [ ] Chat toont duidelijke fout als engine offline
- [ ] Gebruiker kan logs vinden zonder Terminal
- [ ] Network-profiel: geen overbodige herhaalde fetches bij klikken
- [ ] Klik-tot-reactie meetbaar < 100ms voor simpele UI-acties (streefdoel)

---

## Snel testen (nu)

```bash
# Sidecar bereikbaar?
curl -s http://127.0.0.1:48221/v1/readiness

# Stage met zichtbare main logs
/Applications/Stage.app/Contents/MacOS/Stage
```

Als readiness `null`/timeout → chat en AI-runs falen met `fetch failed`.
