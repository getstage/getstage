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
**Subject:** You haven't downloaded Stage yet
**Component:** `emails/DownloadReminder.tsx`

**Body:**

> Hey {{first_name}},
>
> You signed up for Stage yesterday but haven't downloaded the app yet. No worries - it takes 30 seconds.
>
> [Download Stage for macOS] - primary CTA button
>
> Once you open it, you'll set up your account and start your 7-day free trial. Everything runs locally on your Mac.
>
> Not on Mac? [Join the Windows waitlist](https://forms.gle/7X47mM7NmzgoMjeV8) - we'll let you know when we expand.
>
> Adrien

---

### Email 2: First Project Setup

**Trigger:** 1 day after onboarding complete (trial starts)
**From:** adrien@getstage.co
**Subject:** Create your first project in 5 minutes
**Component:** `emails/FirstProject.tsx`

**Body:**

> Hey {{first_name}},
>
> You're in - your 7-day trial is running. Let's make the most of it.
>
> The fastest way to see what Stage can do: create your first project.
>
> **Here's how (5 minutes):**
>
> 1. Open Stage and hit "New Project"
> 2. Paste a brief or describe what you're working on
> 3. Let the AI pull together research, references, and a starting direction
>
> That's it. Stage takes your brief and gives you a head start - competitor research, visual references, and structure - so you're not starting from a blank canvas.
>
> [Open Stage] - primary CTA button
>
> If you get stuck, just reply to this email. I read every one.
>
> Adrien

---

### Email 3: AI Workflow Deep-Dive

**Trigger:** 3 days after onboarding
**From:** adrien@getstage.co
**Subject:** The AI workflow that replaces 4 tools
**Component:** `emails/WorkflowDeepDive.tsx`

**Body:**

> Hey {{first_name}},
>
> Most designers juggle Notion for briefs, Google for research, Pinterest for references, and Figma for wireframes. Four tabs, four tools, zero connection between them.
>
> Stage replaces that with one workflow:
>
> **Brief** - Paste or write your project brief
> **Research** - AI pulls competitors, market trends, and UX patterns
> **Directions** - Get mood boards and concept territories based on your research
> **Structure** - Generate sitemaps, flows, and wireframes
>
> Every step feeds into the next. Your research informs your concepts. Your concepts shape your wireframes. Nothing gets lost.
>
> And because you connect your own Claude or Codex, there are no usage limits from Stage. Use it as much as you want.
>
> [Try it on a real project] - primary CTA button
>
> Adrien

---

### Email 4: Client Portal + Integrations

**Trigger:** 5 days after onboarding
**From:** adrien@getstage.co
**Subject:** Your clients don't need another Notion link
**Component:** `emails/ClientPortal.tsx`

**Body:**

> Hey {{first_name}},
>
> Every freelancer knows the pain - sharing work through Notion links, Google Drive folders, or long email threads. Your clients lose track, you lose control.
>
> Stage has a built-in client portal. One link, branded with your logo, colors, and custom domain. Share it with your team or your clients - they see project progress, deliverables, and can leave revisions directly.
>
> **What makes it different:**
>
> - Your brand, your logo, your domain - not a generic tool link
> - Clients leave revisions right inside the portal
> - You see every revision live, no back-and-forth emails
> - Share with your team and clients from one place
>
> No more screenshots in Slack. No more "check the Google Drive folder." One link, everything in sync.
>
> [Set up your client portal] - primary CTA button
>
> Adrien

---

### Email 5: Trial Ending Tomorrow

**Trigger:** 6 days after onboarding (1 day before trial ends)
**From:** adrien@getstage.co
**Subject:** Your trial ends tomorrow - here's what happens next
**Component:** `emails/TrialEnding.tsx`

**Body:**

> Hey {{first_name}},
>
> Quick heads up - your 7-day trial ends tomorrow. Your card on file will be charged automatically and your plan kicks in. No interruption, your projects stay exactly where they are.
>
> If you want to cancel, you can do it in Settings before the trial ends. No questions asked.
>
> But if Stage helped you move faster on even one project this week - the research, the AI workflows, the client portal - it's already paying for itself.
>
> **A few things you might not have tried yet:**
>
> - Use the Mac shortcut to get instant AI feedback on whatever's on your screen
> - Generate multiple concept directions from a single brief
> - Use the portal to collect client revisions in one place
>
> [Open Stage] - primary CTA button
>
> If you have any feedback or questions, just reply here. I read every one.
>
> Adrien

---

## Flow B: Paid User Retention

Post-purchase sequence for paying users. Goal: educate on advanced features, reduce churn, build relationship.

---

### Email 1: Welcome to Pro/Studio

**Trigger:** Immediately after payment
**From:** adrien@getstage.co
**Subject:** You're on the team
**Component:** `emails/WelcomePro.tsx`

**Body:**

> Hey {{first_name}},
>
> Thanks for going Pro. You now have full access to Stage - no limits, no expiration.
>
> Two things to set up now:
>
> **1. Your client portal**
> Add your brand, logo, and custom domain. Takes 2 minutes and your clients will notice the difference.
>
> **2. Join the Stage Slack**
> This is where you get priority support, share feedback, and connect with other designers using Stage. I'm in there daily.
>
> [Set up my portal] - primary CTA button
> [Join the Slack](https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ) - secondary text link
>
> Welcome aboard.
>
> Adrien

---

### Email 2: Power User Tips

**Trigger:** 3 days after payment
**From:** adrien@getstage.co
**Subject:** 3 things most designers miss in Stage
**Component:** `emails/PowerUserTips.tsx`

**Body:**

> Hey {{first_name}},
>
> You've been on Stage for a few days now. Here are three features that most people don't find on their own:
>
> **1. Mac shortcut - your UX co-pilot**
> Hit the shortcut from anywhere - Figma, a browser, whatever's on screen. Stage analyzes what you're looking at and gives you instant feedback. It's the fastest way to get a second opinion on any design.
>
> **2. Regenerate and iterate**
> Not happy with what Stage generated? Hit Regenerate. Or give it feedback and iterate - refine a strategy doc, rework a wireframe, adjust the direction. Stage gets sharper every round.
>
> **3. AI critique before client review**
> Before you share work with a client, let Stage critique it first. It catches spacing issues, hierarchy problems, and inconsistencies you might miss after staring at a design for hours.
>
> [Open Stage] - primary CTA button
>
> Adrien

---

### Email 3: Your Workflow, Optimized

**Trigger:** 7 days after payment
**From:** adrien@getstage.co
**Subject:** How designers are using Stage daily
**Component:** `emails/DailyWorkflow.tsx`

**Body:**

> Hey {{first_name}},
>
> After a week on Stage, here's how designers are making it their daily driver:
>
> **Morning: new project lands**
> Client sends a brief. Paste it into Stage. In 5 minutes you have competitor research, visual references, and a strategic direction - before you even open Figma.
>
> **Afternoon: deep work**
> You're designing in Figma. Hit the Stage shortcut to get a quick critique, explore a different layout approach, or check if your hierarchy makes sense. No context switching.
>
> **End of day: client update**
> Share progress through your portal. Your client sees the work, leaves revisions in one place. No email threads, no Notion links, no "which version is latest?"
>
> One tool, the entire workflow. That's the idea.
>
> [Open Stage] - primary CTA button
>
> Adrien

---

### Email 4: How's It Going?

**Trigger:** 14 days after payment
**From:** adrien@getstage.co
**Subject:** Quick question
**Component:** `emails/Feedback.tsx`

**Body:**

> Hey {{first_name}},
>
> You've been on Stage for two weeks now. I'd love to hear how it's going.
>
> One quick question - what's the one thing you wish Stage did better?
>
> Just reply to this email. I read every response personally and it directly shapes what we build next.
>
> Thanks for being an early user. It means a lot.
>
> Adrien
>
> P.S. If you haven't already, [join the Slack](https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ) - that's where feature requests turn into shipped updates.

---

## Technical Setup

- **Email tool:** Resend Automations (trigger-based drip sequences)
- **Templates:** React Email components in `emails/`
- **Sender:** adrien@getstage.co (Resend, verified domain)
- **Assets:** Hosted from repo (`emails/assets/`)
- **Slack:** https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ
- **Events needed from Convex:**
  1. `user.signed_up` - web sign-up completed
  2. `user.app_downloaded` - macOS app first opened
  3. `user.onboarding_complete` - trial started (credit card entered)
  4. `user.payment_confirmed` - converted to paid
- **Windows waitlist:** https://forms.gle/7X47mM7NmzgoMjeV8
