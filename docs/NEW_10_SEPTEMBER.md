# Commentary — 10 September 2026

Adrien testing notes. Item **3** was not in this packet. Item 2 is the hard one.

Living plan: [`NEW_VERSION_START_SEPTEMBER_2026.md`](./NEW_VERSION_START_SEPTEMBER_2026.md)

---

### 1. Rename imported skill

- [x] Hover the imported skill **title** → pen on the right
- [x] Click pen → edit the title
- [x] Mesh thumbnail (`<agents>`) uses the new name

Imported items already store `name`. Persist the edit so picker + export use it.

**Difficulty:** M

---

### 2. Component Import = homepage scrape

- [x] Import is the **library homepage**, not GitHub
- [x] Import button uses a **web** icon, not the GitHub SVG
- [x] Scrape **logo** (left of title) and **subtitle** from the site

Fetch the homepage over public HTTPS in Electron (same private-IP lock as export). Parse `apple-touch-icon`, then `og:image`, then favicon. Store the icon URL, not the bytes. Title from `og:title` / `<title>`, subtitle from `og:description`. If scrape fails: hostname + generic blocks icon. GitHub URLs still import as before. Do **not** scrape aura.build into the catalog.

**Difficulty:** H

- [x] Public https homepage (GitHub still OK as fallback)
- [x] Fetch title/description + favicon / `apple-touch-icon` / `og:image`
- [x] Same private-IP rules as export assets
- [x] Do **not** scrape aura.build into the catalog
- [x] Persist `name`, `subtitle`, `iconUrl` on `importedSkillHubItems`

---

### 4. Copy Link is broken

- [x] Share skills → **Copy Link** copies the GitHub URL

Uses the existing Electron clipboard helper instead of `navigator.clipboard`.

**Difficulty:** S

---

### 5. Export step 1 → Next

- [x] Remove footer **Skills & components**
- [x] Change purple CTA from **Export** to **Next**
- [x] User must go to skills before export

Destinations stay on step 2 only.

**Difficulty:** S

---

### 6. Export step 2

- [x] Step 2 is already correct (imported on top, catalog below, Use in project / Selected, Back + Export)

No change.
