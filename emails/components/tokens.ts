import type { CSSProperties } from "react";

export const BRAND = "#8782F5";
export const BRAND_DEEP = "#6E68E8";
export const INK = "#0A0A0A";
export const TEXT = "#262626";
export const MUTED = "#525252";
export const SUBTLE = "#737373";
export const HAIRLINE = "#EDEDED";

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif";

export const gutter = "0 40px";

export const body: CSSProperties = {
  backgroundColor: "#FFFFFF",
  fontFamily: fontStack,
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

export const container: CSSProperties = {
  backgroundColor: "#FFFFFF",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "0 0 48px",
};

export const heroSection: CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: "#F4F4F2",
  borderBottom: `1px solid ${HAIRLINE}`,
  lineHeight: 0,
};

export const heroImg: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: "560px",
  height: "auto",
  border: 0,
  outline: "none",
};

export const logoSection: CSSProperties = {
  margin: "40px 40px 32px",
};

export const logoSectionNoHero: CSSProperties = {
  margin: "48px 40px 32px",
};

export const sectionImageWrap: CSSProperties = {
  margin: "8px 0 24px",
  padding: gutter,
  lineHeight: 0,
};

export const sectionImage: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
  border: `1px solid ${HAIRLINE}`,
  borderRadius: "10px",
  outline: "none",
};

export const wordmarkText: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "-0.04em",
  lineHeight: "23px",
  color: "#14121C",
  display: "inline-block",
};

export const greeting: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: "22px",
  color: TEXT,
  margin: "0 0 20px",
  padding: gutter,
};

export const lede: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "20px",
  fontWeight: 600,
  lineHeight: "28px",
  letterSpacing: "-0.01em",
  color: INK,
  margin: "0 0 24px",
  padding: gutter,
};

export const paragraph: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "24px",
  color: MUTED,
  margin: "0 0 20px",
  padding: gutter,
};

export const subheading: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "22px",
  color: INK,
  margin: "0 0 8px",
  padding: gutter,
};

export const listItem: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "24px",
  color: MUTED,
  margin: "0 0 10px",
  padding: gutter,
};

export const ctaSection: CSSProperties = {
  margin: "32px 0 32px",
  padding: gutter,
};

export const ctaCell: CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: "8px",
  boxShadow:
    "0 1px 2px rgba(10,10,10,0.08), inset 0 1px 0 rgba(255,255,255,0.18)",
};

export const ctaLink: CSSProperties = {
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

export const hr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${HAIRLINE}`,
  margin: "32px 40px",
};

export const secondary: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: "22px",
  color: SUBTLE,
  margin: "0 0 8px",
  padding: gutter,
};

export const secondaryLinkRow: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "22px",
  margin: "0 0 32px",
  padding: gutter,
};

export const textLink: CSSProperties = {
  color: BRAND_DEEP,
  textDecoration: "none",
  fontWeight: 500,
};

export const signoff: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "22px",
  color: MUTED,
  margin: "0 0 4px",
  padding: gutter,
};

export const signature: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 500,
  lineHeight: "22px",
  color: TEXT,
  margin: "0",
  padding: gutter,
};

export const postscript: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: "22px",
  color: SUBTLE,
  margin: "20px 0 28px",
  padding: gutter,
};

export const stepRow: CSSProperties = {
  margin: "0 0 16px",
  padding: gutter,
};

export const stepIconCell: CSSProperties = {
  width: "36px",
  paddingRight: "14px",
  paddingTop: "0px",
  verticalAlign: "top",
};

export const stepIconChip: CSSProperties = {
  width: "36px",
  height: "36px",
  backgroundColor: BRAND,
  borderRadius: "8px",
  textAlign: "center",
  verticalAlign: "middle",
};

export const stepIcon: CSSProperties = {
  display: "inline-block",
  width: "20px",
  height: "20px",
  border: 0,
  outline: "none",
  verticalAlign: "middle",
};

export const stepTitle: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "22px",
  color: INK,
  margin: "0 0 2px",
};

export const stepBody: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "15px",
  fontWeight: 400,
  lineHeight: "22px",
  color: MUTED,
  margin: 0,
};

export const avatar: CSSProperties = {
  display: "block",
  width: "56px",
  height: "56px",
  borderRadius: "9999px",
  border: 0,
  outline: "none",
};

export const footer: CSSProperties = {
  fontFamily: fontStack,
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: "18px",
  color: "#A3A3A3",
  margin: "24px 0 0",
  padding: gutter,
};

export const footerLink: CSSProperties = {
  color: SUBTLE,
  textDecoration: "underline",
};
