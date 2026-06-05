# Desktop startup performance — prioriteit

> **Status:** open, **hoge prioriteit** (juni 2026)  
> **Scope:** `apps/user-application` (Electron main + renderer + sidecar boot)

---

## Notitie

**De startup-tijd van Stage Desktop moet veel beter.** Gebruikers merken nu een trage cold start (app openen → bruikbaar venster). Dat is geen acceptabele launch-ervaring en moet structureel worden aangepakt.

Dit is **niet** optioneel polish — het hoort bij de basis desktop-kwaliteit naast auth, updates en voice.

---

## Wat gebruikers nu voelen

- Lang wachten tussen app-icon klikken en een responsief dashboard
- Sidecar (`stage-engine`) start pas na Electron ready
- Zware renderer-bundle (~3MB+ JS) laadt bij elke cold start
- Convex-connect + project data pas na volledige renderer boot

---

## Richting (nog niet geïmplementeerd)

1. **Meet eerst** — cold start tot `ready-to-show`, tot eerste Convex sync, tot sidecar healthy
2. **Parallel boot** — sidecar eerder / parallel met venster, niet sequentieel blokkeren
3. **Renderer** — code-splitting, lazy routes, minder work vóór eerste paint
4. **Splash / skeleton** — direct venster + loading state i.p.v. leeg scherm
5. **Packaged path** — verifieer dat `app://` + asar geen onnodige I/O toevoegt

---

## Acceptatie (streefdoel)

| Meting | Nu (gevoel) | Doel |
|--------|-------------|------|
| Venster zichtbaar | traag | < 2s op M-series Mac |
| Interactief dashboard | traag | < 4s cold start |
| Sidecar ready | onbekend | meetbaar + niet blokkerend voor UI |

Exacte cijfers invullen na eerste profiling-run.

---

## Gerelateerd

- [**`DESKTOP_SPEED_AND_RELIABILITY_PLAN.md`**](./DESKTOP_SPEED_AND_RELIABILITY_PLAN.md) — **actieplan** P0 uploads + performance fasen
- [`DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md`](./DESKTOP_PERFORMANCE_AND_OBSERVABILITY.md) — traagheid, fetches, logs, chat/engine errors
- [`DESKTOP_RELEASE_AND_TESTING_PLAN.md`](./DESKTOP_RELEASE_AND_TESTING_PLAN.md)
- Sidecar supervisor: `apps/user-application/electron/sidecar.ts`
- Main window: `apps/user-application/electron/windows.ts`
