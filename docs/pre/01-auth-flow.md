# STAGE — 01. Auth Flow

## Overview
Stage uses a unified auth entry point. There is no separate "Sign Up" and "Sign In" page. One screen handles both — Stage detects whether the email is new or existing and routes accordingly.

Authentication is passwordless — email + 6-digit verification code.

---

## Screen 1.1 — Email Input

### Purpose
Single entry point for all users (new and returning).

### Layout
- Centered vertically and horizontally on the page
- Max-width container: ~400px
- Full-page background: Stage background color (off-white)
- No navigation bar. No header. No footer. Just the centered content.

### Elements (top to bottom)

1. **Stage logo**
   - Small, centered above the form
   - Margin below: 32px

2. **Headline**
   - Text: "Track your creative projects with clarity"
   - Style: Body size or slightly larger, secondary text color
   - Centered, single line
   - Margin below: 40px

3. **Email input field**
   - Placeholder: "Your email address"
   - Type: email
   - Full width of container
   - Minimal style — subtle border or underline
   - Auto-focus on page load
   - Margin below: 16px

4. **Continue button**
   - Text: "Continue"
   - Style: Primary CTA (accent color, filled, rounded)
   - Full width of container
   - Disabled state until valid email is entered

### User Actions
| Action | Leads to |
|--------|----------|
| Enter email + click "Continue" | Screen 1.2 (Verification Code) |
| Press Enter key | Same as clicking Continue |

### States
- **Default:** Empty field, button disabled
- **Typing:** Field active, button remains disabled until valid email format
- **Valid email entered:** Button becomes enabled (accent color)
- **Submitting:** Button shows subtle loading state (no spinner — just muted text or slight opacity change)
- **Error (invalid email format):** Inline text below field: "Please enter a valid email address." Soft red color.
- **Error (server error):** Inline text below field: "Something went wrong. Please try again." Soft red color.

### Visual Notes
- This screen should feel like a deep breath. Lots of whitespace.
- Nothing competes with the email field. It's the only interactive element.
- No "Sign up" / "Sign in" toggle. No "Forgot password." No OAuth buttons. Just email.

---

## Screen 1.2 — Verification Code

### Purpose
Verify the user's email with a 6-digit code sent to their inbox.

### Layout
- Same centered layout as Screen 1.1
- Same max-width container (~400px)
- Same full-page background
- No navigation bar

### Elements (top to bottom)

1. **Stage logo**
   - Same as Screen 1.1
   - Margin below: 32px

2. **Headline**
   - Text: "Check your email"
   - Style: Slightly larger than body, primary text color, medium weight
   - Centered
   - Margin below: 8px

3. **Subtitle**
   - Text: "We sent a code to {user's email}"
   - Style: Body size, secondary text color
   - Centered
   - The email address is displayed in primary text color or slightly emphasized
   - Margin below: 40px

4. **Code input**
   - 6 individual digit boxes in a horizontal row (not one long input field)
   - Each box: ~48px wide, ~56px tall, centered text, large font size
   - Subtle border, rounded corners
   - Auto-focus on first box on page load
   - Auto-advance: typing a digit moves focus to the next box
   - Paste support: pasting a 6-digit code fills all boxes
   - Margin below: 16px

5. **Send again link**
   - Text: "Didn't receive a code? Send again"
   - Style: Small text, secondary color. "Send again" is a clickable text link in accent color.
   - Centered
   - After clicking: text changes to "Code sent!" for 3 seconds, then reverts
   - Cooldown: the link is disabled for 30 seconds after sending

### User Actions
| Action | Leads to |
|--------|----------|
| Enter complete 6-digit code (new user) | Screen 2.1 (Onboarding — Name & Role) |
| Enter complete 6-digit code (existing user) | Dashboard |
| Click "Send again" | Sends a new verification code to email |

### States
- **Default:** Empty boxes, first box focused
- **Typing:** Digits appear, focus advances automatically
- **Complete (all 6 digits entered):** Auto-submit. No need to click a button. Brief loading state.
- **Success (new user):** Smooth transition to onboarding
- **Success (returning user):** Smooth transition to dashboard
- **Error (wrong code):** Boxes shake subtly (micro-animation). Inline text below: "Incorrect code. Please try again." Boxes clear for re-entry.
- **Error (expired code):** Inline text: "This code has expired. We've sent a new one." Auto-send again.
- **Cooldown:** "Send again" link is muted/disabled. Optional: subtle countdown text "Send again in 28s"

### Visual Notes
- The 6-box code input is the hero element. Big, centered, satisfying to fill.
- Auto-submit on completion is important — removes one click from the flow.
- The transition out of this screen should be smooth. No hard page reload.
- Keep the same visual language as Screen 1.1. The user should feel they're in the same flow, not a different page.

---

## Routing Logic (No Separate Screens)

After successful code verification, Stage checks:
- **Email exists in database** → Existing user → Route to Dashboard
- **Email is new** → New user → Route to Onboarding Flow (Screen 2.1)

This happens silently. The user never sees a "choose sign up or sign in" decision.
