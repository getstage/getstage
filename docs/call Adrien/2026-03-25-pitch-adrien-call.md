# Pitch Voorbereiding - Call met Adrien
**Datum:** 25 maart 2026, 18:00
**Doel:** Volgende stappen Stage bespreken - growth, pricing, value, monetisatie

---

## Slideshow maken

Kopieer onderstaande prompt in Claude.ai (of een ander AI tool) samen met de inhoud van dit document:

> Maak een professionele slideshow presentatie op basis van het onderstaande document.
> Gebruik een strak, modern design met de Stage brand kleuren (paars #6C5CE7, wit, lichtgrijs).
> Elke "## Slide" sectie is een aparte slide. Houd de slides visueel en niet te veel tekst -
> gebruik bullet points, icons, en tabellen waar mogelijk.
> Maak het als een interactieve HTML presentatie (reveal.js stijl) die ik lokaal kan openen.
> Voeg een title slide toe met "Stage - Next Steps" en het Stage logo (getstage.co).
> De toon is professioneel maar casual - het is een gesprek met een klant/partner, geen investeerders pitch.
> Taal: Engels (Adrien is Frans, we communiceren in het Engels).
>
> LET OP: De "Impact App" slide (Slide 8) moet subtiel zijn - het is een apart project, niet het hoofdonderwerp.

**Alternatief:** Upload dit .md bestand naar https://gamma.app of https://slidev.com voor een instant presentatie.

---

## Slide 1: Waar staan we nu?

### Funnel Analytics

| Metric | Waarde | Conversie |
|---|---|---|
| Bezoekers | 303 | - |
| Accounts aangemaakt | 49 | **16% van bezoekers** |
| Onboarding afgerond | 44 | **90% van signups** |
| Project aangemaakt | 29 | **59% van signups** |
| Betalende klanten | 0 | - |

**De funnel werkt. Het product werkt. Twee dingen moeten beter: de value die we leveren en het aantal bezoekers.**

### Demografie
- Top landen: India (55), VS (43), Frankrijk (25), Duitsland (14), NL (10)
- 52% bezoekers op mobile (iOS 102, Android 56)

---

## Slide 2: Het Value Probleem + De Oplossing

### Waarom niemand betaalt (nog)
Het huidige product is goed maar niet **onvervangbaar**. Mensen denken: "dit kan ik ook in Notion/Trello."

**Wat ontbreekt:**
- Er is geen moment van "wow, dit kan ik nergens anders"
- De free tier geeft te veel weg (3 projecten)
- Er is geen duidelijke reden om te upgraden tenzij je team members wilt

### De oplossing: Stage wordt AI-first

Stage gaat van "nog een PM tool" naar **de eerste AI-native studio manager voor creatives**.

Geen enkele concurrent heeft dit. Niet Notion, niet HoneyBook, niet Dubsado.

**Quick wins (deze week):**
1. Free tier beperken naar 1 project - dwingt keuze af
2. In-app upgrade nudges op de juiste momenten
3. Client portal prominenter maken als Pro feature

---

## Slide 3: AI-First Visie

### Wat betekent AI-first voor Stage?

Een freelancer opent Stage en zegt:
> "Ik moet een brandingpakket maken voor een restaurant, budget 3000 euro, deadline 6 weken"

**Stage doet dan automatisch:**
1. Genereert projectstructuur (fases, taken, milestones, uren)
2. Genereert design mockups via **Google Stitch** (UI screens voor het restaurant)
3. Koppelt alles aan Figma/Notion/Slack
4. Maakt een client portal klaar om te delen
5. Stelt betalingsmilestones voor via Stripe

**Dit bestaat nergens. Dit is de killer.**

### De technologie erachter

| Component | Wat het doet | Tech |
|---|---|---|
| **AI Project Generator** | Projectstructuur uit tekst | Claude API / OpenClaw |
| **AI Design Generator** | UI mockups uit beschrijving | Google Stitch SDK |
| **AI Chat Assistant** | Praat over je projecten | OpenClaw + MCP |
| **Integrations** | Verbindt alles | Figma API, Notion API, Slack webhooks |

### Google Stitch - Waarom dit een gamechanger is
- Google's AI design tool - genereert complete UI screens uit tekst
- Heeft een **SDK** (npm package) en **MCP server**
- Stage kan het direct aanroepen: gebruiker beschrijft project, Stitch genereert designs
- Export naar Figma of HTML - direct bruikbaar
- **Voorbeeld:** Freelancer zegt "ik bouw een restaurant website" -> Stage maakt het project + Stitch genereert 5 schermen als startpunt

---

## Slide 4: AI Roadmap - Gefaseerd & Strak

| Fase | Feature | Tech | Doorlooptijd |
|---|---|---|---|
| **Phase 1 (april)** | AI Project Generator | Claude API / OpenClaw | 2-3 weken |
| **Phase 2 (mei)** | Stitch Design Generator | Google Stitch SDK | 2 weken |
| **Phase 3 (juni)** | AI Chat + Integraties | OpenClaw MCP + Figma/Notion/Slack | 4-6 weken |
| Phase 4 (Q3) | Volledige autonome workflow | Alles samen | Iteratief |

### Phase 1: AI Project Generator (april) - PRIORITEIT
- Input: natuurlijke taal beschrijving van project
- Output: fases, taken, timeline, budget, milestones
- Werkt als upgrade trigger: "1 AI project free, unlimited met Pro"
- **Dit is wat we laten zien op social media**

### Phase 2: Stitch Design Generator (mei)
- Integratie via `@google/stitch-sdk`
- Gebruiker beschrijft visuele richting, Stitch genereert UI mockups
- Mockups worden gekoppeld aan project als deliverables
- Export naar Figma of download als HTML
- **USP: geen enkel PM tool genereert ook designs**

### Phase 3: AI Chat + Integraties (juni)
- OpenClaw/Claude als conversational layer over al je projecten
- MCP integratie zodat de AI ook Stitch, Figma, Notion kan aansturen
- Slack notifications bij project updates
- Notion import/export
- **Stage wordt een volledig autonoom systeem**

### Waarom AI-first en waarom nu?
- Het verhoogt de value direct - mensen hebben een reden om te betalen
- Het is spectaculair in demo's en social content - viral potentieel
- Het trekt een ander type gebruiker aan (AI-curious creatives)
- Adrien kan het laten zien aan 300K volgers
- **Concurrentievoordeel:** Wie dit als eerste doet, wint de niche

---

## Slide 4: Pricing Strategie

### Huidige pricing
- Free: 3 projecten, geen team/portal
- Pro: $9/maand of $49/jaar (early access)

### Voorstel gefaseerd

**Fase 1 - Nu (maart-april):**
- Free tier: 1 project (was 3), 1 AI-generated project, geen team/portal
- Pro: $9/maand of $49/jaar blijft (early access pricing)
- Communicatie: "Dit is een early access prijs die omhoog gaat"

**Fase 2 - Na AI launch (mei):**
- Free trial: 14 dagen met creditcard
- Pro: $15/maand of $99/jaar
- Bestaande betalers houden "founder rate" ($9/$49)
- AI project generator wordt de key selling point

**Fase 3 - Bij schaal (Q3):**
- Team tier: $29/maand (team features + unlimited AI)
- Enterprise: custom pricing

**Naar Adrien:** "We zitten nu in early access. De prijzen gaan omhoog zodra we AI lanceren. Wie nu betaalt, lockt de laagste prijs voor altijd."

---

## Slide 5: Traffic & Growth Plan - Van 303 naar 3.000 bezoekers

### Huidige situatie
- **303 bezoekers** -> 49 signups (16%) -> 29 projecten (59%)
- De funnel converteert goed. Het probleem is puur **volume**.
- Doel: **10x traffic in 3 maanden** (= 3.000 bezoekers = ~500 signups = ~50 betalend)

### A) Adriens Social Media (300K volgers) - Direct impact

| Actie | Verwachte reach | Verwachte clicks |
|---|---|---|
| 1x Instagram Reel "How I run my studio" | 50-100K views | 500-2.000 |
| 1x TikTok tutorial "AI maakt mijn project" | 30-80K views | 300-1.500 |
| Story set met link sticker (weekly) | 10-20K views/week | 100-400/week |
| Bio link naar getstage.co | Permanent | 50-100/dag |

**Dit alleen al kan 303 -> 2.000+ bezoekers/maand opleveren.**
Adrien hoeft maar 1 goede video te maken die de AI project generator laat zien.

### B) SEO via Free Tools - Medium termijn (3-6 maanden)
Bewezen strategie - voorbeeld **Postel**: 139K clicks, 13.2M impressions in 16 maanden met gratis tools.

**Concrete tools voor getstage.co/tools:**

| Tool | Zoekvolume (geschat) | Moeilijkheid |
|---|---|---|
| Freelance Rate Calculator | 8K/maand | Laag |
| Invoice Generator | 40K+/maand | Medium |
| Project Cost Estimator | 5K/maand | Laag |
| Client Brief Template | 3K/maand | Laag |
| Project Timeline Calculator | 2K/maand | Laag |

- Elk tool = een pagina op getstage.co met SEO content
- Elk tool heeft een CTA: "Need to manage the full project? Try Stage"
- **Start met 2-3 tools in april, voeg maandelijks toe**
- Verwacht: **500-2.000 organische bezoekers/maand na 3-6 maanden**

### C) Email Marketing Campaign - Deze week
- Poll naar 49 users + waiting list: "Wat gebruik je? Wat mis je? Zou je betalen?"
- Adrien mailt ook zijn waiting list (hoe groot is die?)
- Segmenteer: wie is actief, wie haakte af, waarom?
- **Goal: 30%+ response rate, kwalitatieve feedback voor pricing beslissing**

### D) Referral Programma - Na eerste betalende klanten
- "Invite a freelancer, both get 1 month Pro free"
- 29 actieve users = 29 potentiele verkopers
- Werk alleen als het product sticky genoeg is (na AI launch)
- **Verwacht: 1.5x groei per maand als referral live is**

### E) Partnerships & Integraties - Gratis traffic via marketplaces
Op de landing page staan al: Stripe, Google Sheets, Figma, Notion, Slack.
- **Stripe & Google Sheets** - werken al
- **Figma, Notion, Slack** - worden gebouwd als onderdeel van AI Phase 3
- **Google Stitch** - nieuw, wordt Phase 2 (AI design generation)
- **Waarom belangrijk voor traffic:**
  - Elke integratie = listing in hun marketplace/directory (gratis traffic)
  - Figma Community, Notion Template Gallery, Slack App Directory = duizenden bezoekers
  - Figma + Stitch samen = complete design workflow in Stage
- **Prioriteit:** Stitch (Phase 2) -> Figma -> Slack -> Notion
- **Bonus:** MCP protocol maakt het mogelijk om alle integraties via 1 AI-laag aan te sturen

### F) Product Hunt Launch - Na AI launch (mei)
- AI Project Generator + Stitch design = perfect voor Product Hunt
- "The first AI-native project manager for creatives"
- **Verwacht: 1.000-5.000 bezoekers in 1 dag**

### Samenvatting verwachte impact

| Kanaal | Tijdlijn | Verwachte bezoekers/maand |
|---|---|---|
| Adriens social media | Direct | 1.000-3.000 |
| SEO free tools | 3-6 maanden | 500-2.000 |
| Email + referral | 1-2 maanden | 100-300 |
| Marketplace listings | 2-3 maanden | 200-500 |
| Product Hunt (eenmalig) | Mei | 1.000-5.000 |
| **Totaal (na 3 maanden)** | | **2.000-6.000+** |

---

## Slide 6: 30-Dagen Actieplan - Eerste Revenue

**Doel:** Eerste betalende klanten voor 24 april 2026

### Week 1 (25-31 maart)
- [ ] Email campaign uitsturen naar 49 users + waiting list
- [ ] Free tier beperken naar 1 project
- [ ] Adrien maakt eerste social content
- [ ] Start bouwen AI Project Generator

### Week 2 (1-7 april)
- [ ] Email resultaten analyseren
- [ ] Persoonlijk outreach top 10 actieve users
- [ ] Adrien post video content
- [ ] AI Project Generator MVP af

### Week 3 (8-14 april)
- [ ] AI feature live - nieuwe social push
- [ ] Follow-up emails
- [ ] Referral programma live
- [ ] SEO: eerste free tools live

### Week 4 (15-24 april)
- [ ] Resultaten meten
- [ ] Directe outreach freelancers in Adriens netwerk
- [ ] **Target: 5-10 betalende klanten**

### Revenue target
- Conservatief: 5 x $9/mo = **$45 MRR**
- Realistisch: 10 x $9/mo + 3 yearly = **$237**
- Na AI launch + prijsverhoging: 15 x $15/mo = **$225 MRR**

---

## Slide 7: Kritische Punten

1. **AI-first is de differentiator** - Zonder dit blijft Stage "nog een PM tool". Met AI wordt het onvervangbaar.
2. **Pricing gaat omhoog na AI launch** - $9 is early access. Na Phase 1+2 naar $15-19/maand.
3. **Focus op creatives** - Marketing richten op Adriens niche (content creators, designers, studios).
4. **Geographic focus** - VS/EU/UK prioriteit, niet India/Brazilie.
5. **Paywall eerder tonen** - AI features als upgrade trigger ("1 AI project free").
6. **Mobile ervaring** - 52% op mobile, PWA overwegen.
7. **Stitch is gratis (beta)** - Nu instappen voordat Google pricing toevoegt.

---

## Slide 8: Nieuw Project - Impact App

**Context:** Adrien heeft een eco-actions app (Impact) gebouwd met Lovable. Vraagt naar development kosten met Figma screens.

**Ons voorstel:**
- **iOS-first** - conversie sterkst op iOS voor consumer/eco doelgroep
- Stage bewijst onze snelheid: 3 weken van start naar live
- De Lovable MVP toont de richting, wij bouwen production-grade
- Spot beschikbaar eind maart / begin april

**Aanpak:**
- Eerst Figma screens en scope bekijken
- Dan pas een prijs noemen
- Kan parallel lopen met Stage doorontwikkeling

**Key message:** "We hebben Stage in 3 weken gelanceerd. Laten we kijken wat de scope is voor Impact en hoe snel we kunnen bewegen."

---

## Key Message voor de hele call

> "Stage werkt - de funnel bewijst het. Nu maken we het AI-first: de eerste PM tool waar je je project beschrijft en alles automatisch wordt aangemaakt - inclusief design mockups via Google Stitch. Geen enkele concurrent heeft dit. Met jouw 300K volgers en deze AI features halen we binnen 30 dagen de eerste betalende klanten binnen."
