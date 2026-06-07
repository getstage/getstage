# Daily Work Audit — 7 June 2026

Last updated: 2026-06-07

Use this table to track everything done today. Add a new row for each change, fix, or decision.

| # | Area | Files | Change | Reason | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | Desktop auth / web handoff | `apps/web-application/src/routes/auth.desktop.tsx` | Fixed `/auth/desktop` staying on infinite spinner after successful login handoff to `stage://auth`. Added success state ("Stage Desktop connected"), auto `window.close()` attempt, manual **Close tab** button, and hidden-link redirect for `stage://` instead of `window.location.assign`. | Auth worked end-to-end, but the browser tab never left the loading screen — bad UX after a successful desktop callback. | Done locally | Needs deploy to `testing.getstage.co` (and prod when ready). Desktop app login itself was already working. |
| 2 | Desktop auto-updates | `apps/user-application/electron/helpers/auto-update.ts` | Enabled automatic update checks on app launch (~10s after startup). Popup only when an update is available (download → restart). Silent when up to date or on network errors. Manual **Check for Updates…** menu unchanged. Opt-out: `STAGE_DISABLE_AUTO_UPDATE_CHECK=1`. | Users had to open **Stage → Check for Updates…** manually; no automatic prompt when a new version shipped. | Done locally | Needs next packaged desktop release for users to receive this behavior. |

## Entry details

### 1. Desktop auth loading screen stuck on spinner

**Observed**
- Desktop app opens browser to `https://testing.getstage.co/auth/desktop?state=...&redirect_uri=stage%3A%2F%2Fauth`
- User signs in successfully
- Stage Desktop receives the session via `stage://auth`
- Browser tab stays on **Opening Stage Desktop...** with spinner forever

**Fix**
- After handoff: show success copy instead of spinner
- Try to close the browser tab automatically
- Fallback **Close tab** button when the browser blocks auto-close
- More reliable `stage://` trigger via hidden anchor click

**Verify after deploy**
- [ ] Open Stage Desktop → Log in
- [ ] Complete web auth
- [ ] Confirm Stage Desktop is signed in
- [ ] Confirm browser shows success state (not infinite spinner)
- [ ] Confirm tab closes or **Close tab** works

### 2. Automatic desktop update popups

**Observed**
- Update flow only ran when user clicked **Stage → Check for Updates…**
- `checkForUpdates()` returned immediately unless `manual: true` was passed
- `initAutoUpdates()` set up listeners but never scheduled a check

**Fix**
- Removed the early return that blocked non-manual checks
- Added `scheduleAutomaticUpdateCheck()` — runs once ~10s after launch (packaged builds only)
- **Update available** → same popups as manual flow (Download → Restart when ready)
- **Up to date** → log only, no popup (avoids "latest version" nag on every launch)
- **Check failed** → log only on auto; manual menu still shows error dialog
- Disable for testing: `STAGE_DISABLE_AUTO_UPDATE_CHECK=1`

**Verify after next desktop release**
- [ ] Launch packaged Stage → wait ~10s → no popup if already on latest
- [ ] Publish a newer version → launch older build → update popup appears
- [ ] **Check for Updates…** still shows "You're on the latest version" when current
