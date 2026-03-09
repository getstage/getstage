# STAGE — 08. Settings & Profile

## Overview
Settings is a utility page. The user should rarely visit it, and when they do, it should take seconds. No sidebar categories, no tabs — just a single vertical page with clearly separated sections.

---

## Entry Point
Profile avatar/initials in global navigation → Dropdown → "Settings"

---

## Layout

- Full-width page
- Global navigation at top (with "← Dashboard" back link or logo click to return)
- Content centered, max-width ~560px
- Vertical stack of sections with generous spacing between them (48–64px)
- Each section has a subtle heading

---

## Section 1 — Profile

### Section heading
- Text: "Profile"
- Style: Small heading, primary color, medium weight
- Margin below: 24px

### Elements

1. **Avatar**
   - Circle, ~64px
   - Shows initials by default (derived from full name)
   - On hover: subtle overlay with "Edit" or camera icon
   - On click: File picker for image upload (jpg, png)
   - Optional — not required. Initials are the default and that's fine.
   - Margin below: 24px

2. **Full name**
   - Label: "Name"
   - Input field, pre-filled with current name
   - Editable inline
   - Style: Minimal input (subtle border or underline)
   - Margin below: 16px

3. **Email**
   - Label: "Email"
   - Displayed as text (not editable directly)
   - Current email shown in primary text
   - "Change email" text link next to it, secondary color
   - On click "Change email": Inline flow — new email field appears below, user enters new email, verification code sent to new email, once verified the email updates
   - Margin below: 16px

4. **Role**
   - Label: "Role"
   - Toggle pills: Freelancer, Studio, In-house, Agency
   - Current role pre-selected
   - Changeable — click another pill to switch
   - Margin below: 16px

5. **Save indicator**
   - All changes auto-save
   - Subtle "Saved" text that briefly appears when changes are detected and saved
   - No "Save" button needed

---

## Section 2 — Plan & Billing

### Section heading
- Text: "Plan & Billing"
- Style: Same as Section 1
- Margin below: 24px

### Elements (if user is on a paid plan)

1. **Current plan**
   - Label: "Plan"
   - Text: "Stage Pro" (or plan name)
   - Style: Primary text, possibly with a subtle "Active" badge in soft green
   - Margin below: 12px

2. **Billing cycle**
   - Label: "Billing"
   - Text: "Monthly" or "Yearly"
   - Margin below: 12px

3. **Next billing date**
   - Label: "Next payment"
   - Text: "{Date}" — e.g., "March 15, 2026"
   - Margin below: 12px

4. **Payment method**
   - Label: "Payment method"
   - Text: "Visa ending in 4242"
   - "Update" text link next to it
   - On click "Update": Opens Stripe customer portal or inline card update form
   - Margin below: 24px

5. **Manage billing link**
   - Text: "Manage billing"
   - Style: Text link, accent color
   - On click: Opens Stripe customer portal (handles invoice history, payment updates)
   - Margin below: 16px

6. **Cancel subscription**
   - Text: "Cancel subscription"
   - Style: Text link, soft red color, small
   - On click: Confirmation dialog
     - Text: "Are you sure you want to cancel? You'll keep access until {end of billing period}."
     - Buttons: "Keep Plan" (primary) and "Cancel Plan" (ghost/secondary, soft red)
   - If cancelled:
     - Status changes to "Cancelling — access until {date}"
     - Cancel link changes to "Reactivate" (allow re-subscription before period ends)

### Elements (if user is on free plan / no plan)

1. **Current plan**
   - Text: "Free" or "No active plan"
   - Margin below: 16px

2. **Upgrade CTA**
   - Text: "Upgrade to Stage Pro"
   - Style: Primary CTA button or accent text link
   - On click: Navigates to pricing page (07)

---

## Section 3 — Clients

### Section heading
- Text: "Clients"
- Style: Same as other sections
- Margin below: 24px

### Purpose
Central place to manage all client names used across projects. Prevents duplicates and allows cleanup.

### Elements

1. **Client list**
   - Vertical list of all client names
   - Each row:
     ```
     Client Name                    [edit icon] [delete icon]
     {X} projects                   (secondary text, small)
     ```
   - Edit icon (pencil or subtle edit indicator): On click, client name becomes an inline editable field. Change is saved on Enter or blur. Updates across all linked projects.
   - Delete icon (subtle "×" or trash): On click, confirmation appears:
     - If projects are linked: "This client is used in {X} projects. Removing it will clear the client name from those projects. Continue?" — "Cancel" / "Remove"
     - If no projects linked: Immediate removal, no confirmation needed
   - Margin below between items: 12px

2. **Empty state** (no clients)
   - Text: "No clients yet. They'll appear here when you create projects."
   - Style: Secondary text, centered

### Visual Notes
- This list should be compact and scannable.
- No avatar or color per client — just names.
- The project count gives useful context without needing a separate client detail page.

---

## Section 4 — Account

### Section heading
- Text: "Account"
- Style: Same as other sections
- Margin below: 24px

### Elements

1. **Delete account**
   - Text: "Delete your account"
   - Style: Text link, soft red color
   - On click: Opens a confirmation dialog
     - Headline: "Delete your account?"
     - Text: "This will permanently delete all your projects, tasks, and data. This action cannot be undone."
     - Confirmation input: "Type DELETE to confirm"
       - Input field, expects the text "DELETE" (case-sensitive)
       - Delete button disabled until correct text is entered
     - Buttons: "Cancel" (primary/safe) and "Delete Account" (destructive, soft red, disabled until confirmation text matches)

   - After deletion:
     - Session ends
     - Redirect to auth screen
     - All data permanently removed

### Visual Notes
- This is the only place in Stage where intentional friction is applied.
- The "Type DELETE" confirmation is important — prevents accidental clicks.
- The destructive button should feel serious but not alarming. Soft red, not bright red.

---

## Page-Level Notes

### Navigation back
- "← Dashboard" in top-left of navigation or clicking the Stage logo returns to dashboard
- Settings is a detour, not a destination

### No additional sections in v1
Future candidates (not built now):
- Notification preferences (when Stage adds notifications)
- Integrations (if Stage connects to other tools)
- Team / workspace management (if Stage goes multi-user)
- Appearance / theme (if dark mode is added)
- Language / localization

For v1, these four sections are everything the user needs. Keep it minimal.
