# Stage V2 - Email Flows

Email copy for Stage V2 launch. Two flows: Sign-up to Trial Conversion (Flow A) and Paid User Retention (Flow B). All emails sent from adrien@getstage.co via Resend Automations.

---

## Flow A: Sign-up to Trial Conversion

Trigger-based sequence for new sign-ups. Goal: get them to download the macOS app, complete onboarding, and convert to paid.

---

### Email 1: Welcome + Download

**Trigger:** Immediately after web sign-up
**From:** adrien@getstage.co
**Subject:** Welcome to Stage - download your app
**Component:** `emails/WelcomeEmail.tsx`

**Body:**

> Hey {{first_name}},
>
> Welcome to Stage - you just made the right call.
>
> Stage is a design workspace that takes you from brief to wireframes, powered by AI. Research, strategy, concepts, wireframes - all in one place, with your own Claude or Codex doing the heavy lifting.
>
> Your next step: download Stage for Mac.
>
> [Download Stage for macOS] - primary CTA button
>
> Once you open the app, you'll finish setting up your account and start your 7-day free trial. Your first project is 5 minutes away.
>
> Quick heads up - Stage is a macOS app. If you're on Windows, no worries.
> [Join the Windows waitlist](https://forms.gle/7X47mM7NmzgoMjeV8) - text link
>
> Talk soon,
> Adrien

---

### Email 1b: Download Reminder (Conditional)

**Trigger:** 24h after sign-up, IF no app-download event detected
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 2: First Project Setup

**Trigger:** 1 day after onboarding complete (trial starts)
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 3: AI Workflow Deep-Dive

**Trigger:** 3 days after onboarding
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 4: Client Portal + Integrations

**Trigger:** 5 days after onboarding
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 5: Trial Ending Tomorrow

**Trigger:** 6 days after onboarding (1 day before trial ends)
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

## Flow B: Paid User Retention

Post-purchase sequence for paying users. Goal: educate on advanced features, reduce churn, build relationship.

---

### Email 1: Welcome to Pro/Studio

**Trigger:** Immediately after payment
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 2: Power User Tips

**Trigger:** 3 days after payment
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 3: Your Workflow, Optimized

**Trigger:** 7 days after payment
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

### Email 4: How's It Going?

**Trigger:** 14 days after payment
**From:** adrien@getstage.co
**Subject:** TBD
**Component:** TBD

**Body:**

*Status: Pending*

---

## Technical Setup

- **Email tool:** Resend Automations (trigger-based drip sequences)
- **Templates:** React Email components in `emails/`
- **Sender:** adrien@getstage.co (Resend, verified domain)
- **Assets:** Hosted from repo (`emails/assets/`)
- **Events needed from Convex:**
  1. `user.signed_up` - web sign-up completed
  2. `user.app_downloaded` - macOS app first opened
  3. `user.onboarding_complete` - trial started (credit card entered)
  4. `user.payment_confirmed` - converted to paid
- **Windows waitlist:** https://forms.gle/7X47mM7NmzgoMjeV8
