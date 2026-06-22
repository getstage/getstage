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
import * as s from "./tokens";

export interface EmailLayoutProps {
  preview: string;
  /** Absolute URL to the Stage mark icon (dark, ~19x23). */
  markUrl?: string;
  /** Replaces the default wordmark composition (mark + "Stage") with custom content. */
  headerNode?: React.ReactNode;
  hero?: React.ReactNode;
  children: React.ReactNode;
  signoffLine?: string;
  signature?: string;
  /**
   * Per-recipient unsubscribe URL. Defaults to the `{{unsubscribe_url}}` merge
   * placeholder so every send carries a working opt-out link as required by
   * CAN-SPAM and GDPR. Substitute with the real per-recipient URL at send time.
   */
  unsubscribeUrl?: string;
}

const DEFAULT_MARK = "https://getstage.co/email/stage-mark.png";
const DEFAULT_UNSUBSCRIBE_URL = "{{unsubscribe_url}}";

export const EmailLayout = ({
  preview,
  markUrl = DEFAULT_MARK,
  headerNode,
  hero,
  children,
  signoffLine,
  signature = "Adrien",
  unsubscribeUrl = DEFAULT_UNSUBSCRIBE_URL,
}: EmailLayoutProps) => {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>

      <Body style={s.body}>
        <Container style={s.container}>
          {hero}

          <Section style={hero ? s.logoSection : s.logoSectionNoHero}>
            {headerNode ?? (
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                style={{ borderCollapse: "separate" }}
              >
                <tbody>
                  <tr>
                    <td style={{ paddingRight: "8px", verticalAlign: "middle", lineHeight: 0 }}>
                      <Img
                        src={markUrl}
                        width="19"
                        height="23"
                        alt="Stage"
                        style={{ display: "block", border: 0, outline: "none" }}
                      />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                      <span style={s.wordmarkText}>Stage</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Section>

          {children}

          {signoffLine && <Text style={s.signoff}>{signoffLine}</Text>}
          <Text style={s.signature}>{signature}</Text>

          <Hr style={s.hr} />
          <Text style={s.footer}>
            Stage · Sent because you signed up for an account.
            <br />
            <Link href="https://getstage.co" style={s.footerLink}>
              getstage.co
            </Link>
            {" · "}
            <Link href={unsubscribeUrl} style={s.footerLink}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export interface CTAButtonProps {
  href: string;
  label: string;
  iconUrl?: string;
}

export const CTAButton = ({ href, label, iconUrl }: CTAButtonProps) => (
  <Section style={s.ctaSection}>
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ borderCollapse: "separate" }}
    >
      <tbody>
        <tr>
          <td style={s.ctaCell}>
            <Link href={href} style={s.ctaLink}>
              {iconUrl && (
                <span
                  style={{
                    display: "inline-block",
                    verticalAlign: "middle",
                    marginRight: "10px",
                    marginTop: "-2px",
                    lineHeight: 0,
                  }}
                >
                  <img
                    src={iconUrl}
                    width="14"
                    height="17"
                    alt=""
                    style={{
                      display: "inline-block",
                      border: 0,
                      outline: "none",
                      verticalAlign: "middle",
                    }}
                  />
                </span>
              )}
              <span style={{ display: "inline-block", verticalAlign: "middle" }}>
                {label}
              </span>
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
);

export const Divider = () => <Hr style={s.hr} />;
