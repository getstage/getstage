# 9 March 2026 — Onboarding Paywall & Pricing

## Wat is er veranderd?

### Nieuwe onboarding paywall

Na de celebration-animatie in de onboarding flow krijgt de gebruiker nu een **pricing paywall** te zien met twee opties:

1. **Free tier** — $0/forever
   - Max 3 projecten
   - Task management
   - Client portal met Stage branding (geen custom branding)

2. **Pro tier** — Launch price
   - ~~$99/year~~ → **$49/year** (early access launch price, 50% korting)
   - Of $9/month voor wie niet jaarlijks wil
   - Unlimited projecten
   - Custom portal branding
   - Stripe Connect integratie
   - Google Sheets & CSV import
   - Priority support

### Flow

```
Onboarding → Celebration/Confetti → Paywall → Free of Checkout
```

- **"Continue free"** → sluit modal, dashboard laadt
- **"Get Pro"** → onboarding wordt opgeslagen, redirect naar Stripe Checkout

### Bestanden

| Bestand | Wat |
|---------|-----|
| `src/components/onboarding/OnboardingPaywall.tsx` | Nieuw — pricing paywall component |
| `src/components/onboarding/OnboardingModal.tsx` | Paywall step toegevoegd na celebration |
| `src/components/dashboard/DashboardPage.tsx` | Na onComplete → "preview" ipv "paywall" |

### Pricing configuratie (huidige staat)

| Tier | Weergave | Stripe prijs | Status |
|------|----------|--------------|--------|
| Free | $0 | — | Actief |
| Pro yearly | $49/year (launch) | $44.99 (huidige Stripe price ID) | Actief |
| Pro monthly | $9/month | Nog geen Stripe price ID | Visueel aanwezig, nog niet wired |
| Pro standard | $99/year | — | Alleen als doorgestreepte prijs |

### Landing page pricing (`PricingSection.tsx`)

Ongewijzigd. Toont al $99/year en $9/month met free tier melding.

### Nog te doen

- [ ] Aparte Stripe price ID aanmaken voor $49/year launch price
- [ ] Aparte Stripe price ID aanmaken voor $9/month
- [ ] Toggle in paywall daadwerkelijk koppelen aan juiste price ID
- [ ] Free tier limiet (3 projecten) server-side afdwingen
- [ ] Portal branding lock voor free tier
