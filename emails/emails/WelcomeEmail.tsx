import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * Stage -Welcome / Download macOS app
 *
 * A transactional welcome email in the Linear / Raycast aesthetic:
 * white background, one column, generous whitespace, a single
 * lavender-purple CTA, a secondary text link, a personal sign-off.
 *
 * Brand color: #8782F5
 * Typography:  Inter (system-stack fallback for email clients that
 *              strip @font-face -most do)
 *
 * Props are typed so the template can be rendered server-side
 * (e.g. via `render(<WelcomeEmail firstName="Adrien" />)`).
 */

export interface WelcomeEmailProps {
  firstName?: string;
  downloadUrl?: string;
  windowsWaitlistUrl?: string;
  /** Absolute URL to the Stage wordmark (PNG/SVG hosted on your CDN). */
  logoUrl?: string;
  /** Absolute URL to the hero screenshot (Stage app on macOS). */
  heroUrl?: string;
}

const BRAND = "#8782F5";
const BRAND_DEEP = "#6E68E8"; // pressed / outline
const INK = "#0A0A0A";
const TEXT = "#262626";
const MUTED = "#525252";
const SUBTLE = "#737373";
const HAIRLINE = "#EDEDED";

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";

export const WelcomeEmail = ({
  firstName = "there",
  downloadUrl = "https://getstage.co/download/mac",
  windowsWaitlistUrl = "https://forms.gle/REPLACE_WITH_ACTUAL_FORM_ID",
  logoUrl = "https://getstage.co/email/logo-wordmark.png",
  heroUrl = "https://getstage.co/email/stage-hero.png",
}: WelcomeEmailProps) => {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>Welcome to Stage - download the Mac app to start your trial.</Preview>

      <Body style={body}>
        {/* Outer wrapper gives clients a neutral canvas; Container sets the column. */}
        <Container style={container}>
          {/* Hero image */}
          <Section style={heroSection}>
            <Img
              src={heroUrl}
              width="560"
              height="408"
              alt="Stage app on macOS - dashboard view"
              style={heroImg}
            />
          </Section>

          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src={logoUrl}
              width="73"
              height="23"
              alt="Stage"
              style={{ display: "block", border: 0, outline: "none" }}
            />
          </Section>

          {/* Greeting */}
          <Text style={greeting}>Hey {firstName},</Text>

          <Text style={lede}>
            Welcome to Stage - you just made the right call.
          </Text>

          <Text style={paragraph}>
            Stage is a design workspace that takes you from brief to wireframes,
            powered by AI. Research, strategy, concepts, wireframes - all in one
            place, with your own Claude or Codex doing the heavy lifting.
          </Text>

          <Text style={paragraph}>
            Your next step: download Stage for Mac.
          </Text>

          {/* Primary CTA -table-based button for Outlook reliability */}
          <Section style={ctaSection}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              style={{ borderCollapse: "separate" }}
            >
              <tbody>
                <tr>
                  <td style={ctaCell}>
                    <Link href={downloadUrl} style={ctaLink}>
                      {/* Inline SVG renders in Apple Mail / iOS Mail / Gmail web.
                          For Outlook desktop fallback, also ship a PNG copy. */}
                      <span style={ctaIconWrap}>
                        <img
                          src="https://getstage.co/email/apple-glyph-white.png"
                          width="14"
                          height="17"
                          alt=""
                          style={ctaIcon}
                        />
                      </span>
                      <span style={ctaLabel}>Download Stage for macOS</span>
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Text style={paragraph}>
            Once you open the app, you'll finish setting up your account and
            start your 7-day free trial. Your first project is 5 minutes away.
          </Text>

          <Hr style={hr} />

          {/* Secondary - Windows waitlist */}
          <Text style={secondary}>
            Quick heads up - Stage is a macOS app. If you're on Windows, no
            worries.
          </Text>
          <Text style={secondaryLinkRow}>
            <Link href={windowsWaitlistUrl} style={textLink}>
              Join the Windows waitlist →
            </Link>
          </Text>

          {/* Sign-off */}
          <Text style={signoff}>Talk soon,</Text>
          <Text style={signature}>Adrien</Text>

          {/* Footer */}
          <Hr style={hr} />
          <Text style={footer}>
            Stage · Sent because you signed up for an account.
            <br />
            <Link href="https://getstage.co" style={footerLink}>
              getstage.co
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

/* ───────────────────────────── styles ───────────────────────────── */

const body: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  fontFamily: fontStack,
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
  // @ts-expect-error -- vendor prop, valid in email clients
  MozOsxFontSmoothing: "grayscale",
};

const container: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0 0 48px",
};

const heroSection: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: "#F4F4F2",
  borderBottom: `1px solid ${HAIRLINE}`,
  lineHeight: 0,
};

const heroImg: React.CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "560px",
  height: "auto",
  border: 0,
  outline: "none",
};

const logoSection: React.CSSProperties = {
  margin: "40px 40px 32px",
};

/* Body text styles include horizontal padding so the hero can be edge-to-edge
   while the copy stays on a 40px gutter. */
const gutter = "0 40px";

const greeting: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: "22px",
  color: TEXT,
  margin: "0 0 20px",
  padding: gutter,
};

const lede: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: "28px",
  letterSpacing: "-0.01em",
  color: INK,
  margin: "0 0 24px",
  padding: gutter,
};

const paragraph: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "24px",
  color: MUTED,
  margin: "0 0 20px",
  padding: gutter,
};

const ctaSection: React.CSSProperties = {
  margin: "32px 0 32px",
  padding: gutter,
};

const ctaCell: React.CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: "8px",
  // hairline shadow approximated for clients that render box-shadow (Apple Mail, iOS)
  boxShadow: "0 1px 2px rgba(10,10,10,0.08), inset 0 1px 0 rgba(255,255,255,0.18)",
};

const ctaLink: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 22px",
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "20px",
  letterSpacing: "-0.005em",
  color: "#FFFFFF",
  textDecoration: "none",
};

const ctaIconWrap: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "10px",
  marginTop: "-2px",
  lineHeight: 0,
};

const ctaIcon: React.CSSProperties = {
  display: "inline-block",
  border: 0,
  outline: "none",
  verticalAlign: "middle",
};

const ctaLabel: React.CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: `1px solid ${HAIRLINE}`,
  margin: "32px 40px",
};

const secondary: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: "22px",
  color: SUBTLE,
  margin: "0 0 8px",
  padding: gutter,
};

const secondaryLinkRow: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "22px",
  margin: "0 0 32px",
  padding: gutter,
};

const textLink: React.CSSProperties = {
  color: BRAND_DEEP,
  textDecoration: "none",
  fontWeight: 500,
};

const signoff: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "22px",
  color: MUTED,
  margin: "0 0 4px",
  padding: gutter,
};

const signature: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: "22px",
  color: TEXT,
  margin: "0",
  padding: gutter,
};

const footer: React.CSSProperties = {
  fontFamily: fontStack,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: "18px",
  color: "#A3A3A3",
  margin: "24px 0 0",
  padding: gutter,
};

const footerLink: React.CSSProperties = {
  color: SUBTLE,
  textDecoration: "underline",
};
