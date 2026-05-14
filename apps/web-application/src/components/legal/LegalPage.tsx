import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { FooterSection } from "@/components/landing/sections/FooterSection";
import "@/styles/landing.css";

const EFFECTIVE_DATE = "May 14, 2026";
const COMPANY_NAME = "Logiaweb Pte. Ltd.";
const COMPANY_ADDRESS = "68 Circular Road #02-01, 049422, Singapore";
const COMPANY_UEN = "202452099Z";
const SUPPORT_EMAIL = "support@getstage.co";

type LegalSection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type LegalPageKind = "terms" | "privacy";

const termsSections: LegalSection[] = [
  {
    title: "1. Agreement to these Terms",
    body: [
      "These Terms of Service govern your access to and use of Stage, including the Stage website, web application, desktop application, client portals, APIs, integrations, and related services.",
      `Stage is provided by ${COMPANY_NAME}. By creating an account, using Stage, or accessing a shared client portal, you agree to these Terms. If you do not agree, you should not use Stage.`,
    ],
  },
  {
    title: "2. The Stage service",
    body: [
      "Stage helps designers, freelancers, studios, and teams plan projects, organize phases and tasks, share progress with clients, manage project assets, and connect third-party tools used in creative work.",
      "We may change, improve, suspend, or discontinue parts of the service over time. We will try to provide reasonable notice where a material change affects paying customers.",
    ],
  },
  {
    title: "3. Accounts and responsibility",
    body: [
      "You are responsible for the accuracy of the information you provide, for keeping your account credentials secure, and for all activity that happens under your account.",
      "You must be legally able to enter into these Terms. If you use Stage on behalf of a company or client, you represent that you have authority to do so.",
    ],
  },
  {
    title: "4. Subscriptions, billing, and refunds",
    body: [
      "Some Stage features may require a paid subscription or usage-based plan. Prices, limits, and features are shown at checkout or in the product.",
      "Payments are processed by Stripe or another payment provider. Stage does not store full card details. You authorize us and our payment providers to charge applicable fees, taxes, and renewal amounts for the plan you choose.",
      "Unless required by law or stated otherwise at checkout, fees are non-refundable. We may review refund requests case by case if you contact us at support@getstage.co.",
    ],
  },
  {
    title: "5. Your content and client data",
    body: [
      "You keep ownership of the project data, client information, files, notes, tasks, assets, and other content you create, upload, connect, or import into Stage.",
      "You grant Stage a limited license to host, store, copy, process, transmit, display, and otherwise use your content only as needed to provide, secure, support, and improve the service.",
      "If you share a client portal or invite another person, you are responsible for making sure you have permission to share the content and data visible to that person.",
    ],
  },
  {
    title: "6. Third-party services and integrations",
    body: [
      "Stage may let you connect third-party services such as Figma, Notion, Stripe, Google Sheets, Claude, Codex, and similar tools. Your use of those services is also governed by their own terms and privacy policies.",
      "When you choose to use an integration, Stage may send or receive the information necessary to provide the requested feature. For example, this may include project metadata, files, task information, shared URLs, payment records, or selected project context.",
      "For AI and coding-agent workflows, Stage may pass selected context to the third-party tool you choose so that tool can perform the requested action. Stage does not store that transient tool context unless you save the resulting content, output, metadata, or artifact back into Stage.",
    ],
  },
  {
    title: "7. Acceptable use",
    body: ["You agree not to misuse Stage or help anyone else misuse it. In particular, you must not:"],
    bullets: [
      "break the law or violate the rights of others;",
      "upload malware, harmful code, or content intended to disrupt systems;",
      "attempt to access accounts, data, systems, or integrations without permission;",
      "reverse engineer, scrape, overload, or interfere with Stage except as allowed by law;",
      "use Stage to store or share unlawful, abusive, deceptive, or infringing content;",
      "use Stage to process highly sensitive data unless we have expressly agreed to support that use case.",
    ],
  },
  {
    title: "8. Intellectual property",
    body: [
      "Stage, including its software, branding, design, documentation, and related materials, is owned by Logiaweb Pte. Ltd. or its licensors and is protected by intellectual property laws.",
      "These Terms do not give you ownership of Stage. You may not use the Stage name, logo, or brand assets without our permission, except to identify Stage as the service you use.",
    ],
  },
  {
    title: "9. Privacy",
    body: [
      "Our Privacy Policy explains how we collect, use, share, and protect personal data. By using Stage, you also agree to the practices described in the Privacy Policy.",
    ],
  },
  {
    title: "10. Termination",
    body: [
      "You may stop using Stage at any time. We may suspend or terminate access if you violate these Terms, create risk for Stage or other users, fail to pay applicable fees, or if we are required to do so by law.",
      "After termination, we may delete or retain data in accordance with our Privacy Policy, legal obligations, backup practices, and legitimate business needs.",
    ],
  },
  {
    title: "11. Disclaimers",
    body: [
      "Stage is provided on an as-is and as-available basis. We do not guarantee that Stage will be uninterrupted, error-free, secure, or that it will meet every business, legal, tax, accounting, compliance, or client-management need.",
      "Stage may provide project, payment, analytics, AI, or workflow information, but that information is not legal, financial, accounting, or professional advice.",
    ],
  },
  {
    title: "12. Limitation of liability",
    body: [
      "To the maximum extent permitted by law, Logiaweb Pte. Ltd. will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, data, goodwill, or business opportunities.",
      "To the maximum extent permitted by law, our total liability for any claim relating to Stage or these Terms will not exceed the amount you paid to Stage in the three months before the event giving rise to the claim, or SGD 100 if you have not paid us.",
    ],
  },
  {
    title: "13. Changes to these Terms",
    body: [
      "We may update these Terms from time to time. If changes are material, we will take reasonable steps to notify you, such as by email or an in-product notice. Your continued use of Stage after changes take effect means you accept the updated Terms.",
    ],
  },
  {
    title: "14. Governing law",
    body: [
      "These Terms are governed by the laws of Singapore, without regard to conflict-of-law rules. The courts of Singapore will have exclusive jurisdiction over disputes relating to these Terms or Stage, except where applicable law requires otherwise.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      `If you have questions about these Terms, contact us at ${SUPPORT_EMAIL}.`,
      `${COMPANY_NAME}, ${COMPANY_ADDRESS}. UEN: ${COMPANY_UEN}.`,
    ],
  },
];

const privacySections: LegalSection[] = [
  {
    title: "1. Who we are",
    body: [
      `Stage is operated by ${COMPANY_NAME}. This Privacy Policy explains how we collect, use, disclose, and protect personal data when you use Stage.`,
      `You can contact us at ${SUPPORT_EMAIL}. Our company address is ${COMPANY_ADDRESS}. UEN: ${COMPANY_UEN}.`,
    ],
  },
  {
    title: "2. Information we collect",
    body: ["We collect information that you provide, information generated by your use of Stage, and information from services you choose to connect."],
    bullets: [
      "Account information, such as your name, email address, authentication details, profile settings, and workspace preferences.",
      "Project and client information, such as project names, phases, tasks, dates, client names, notes, files, briefs, assets, comments, and client portal content.",
      "Billing information, such as subscription status, plan details, payment events, invoices, and limited payment metadata from Stripe. We do not store full card numbers.",
      "Integration information from third-party services you connect, such as Figma, Notion, Stripe, Google Sheets, Claude, Codex, and similar tools.",
      "Usage, device, and log information, such as IP address, browser, device type, pages viewed, product interactions, diagnostic logs, and security events.",
      "Support communications and feedback you send to us.",
    ],
  },
  {
    title: "3. AI and coding-agent context",
    body: [
      "Stage may let you use third-party AI or coding-agent tools, including Claude, Codex, and similar services. When you ask Stage to use one of these tools, Stage may send selected project context or user-provided instructions to that tool so it can perform the requested action.",
      "Stage does not store that transient third-party tool context unless you choose to save resulting content, output, metadata, or artifacts back into Stage. The third-party provider may process the information according to its own terms and privacy policy.",
    ],
  },
  {
    title: "4. How we use information",
    body: ["We use the information we collect to:"],
    bullets: [
      "provide, operate, maintain, and improve Stage;",
      "create and manage accounts, workspaces, projects, tasks, client portals, and integrations;",
      "process billing, subscriptions, payments, invoices, and plan access;",
      "sync or import data from services you connect;",
      "send service, security, billing, and support communications;",
      "measure product usage, diagnose issues, prevent abuse, and improve performance;",
      "comply with legal obligations and enforce our Terms.",
    ],
  },
  {
    title: "5. Third-party providers",
    body: [
      "We use third-party providers to operate Stage. These providers may process personal data only as needed to provide their services to us or to you.",
      "Examples include hosting and backend infrastructure, authentication, file storage, payment processing, email delivery, analytics, customer support, and user-selected integrations such as Figma and Notion.",
      "When you connect a third-party service, you authorize Stage to exchange the information required for that integration. You can usually disconnect integrations from Stage settings or from the third-party service.",
    ],
  },
  {
    title: "6. Analytics and cookies",
    body: [
      "Stage may use cookies, local storage, and similar technologies to keep you signed in, remember preferences, secure the service, understand usage, and improve the product.",
      "We use analytics tools, including DataFast, to understand how Stage is used and which product or marketing activities are effective. You can control cookies through your browser settings, though some features may not work correctly without them.",
    ],
  },
  {
    title: "7. How we share information",
    body: [
      "We do not sell your personal data. We may share information with service providers, payment processors, integration providers you choose to connect, professional advisors, authorities where legally required, and parties involved in a business transfer such as a merger or acquisition.",
      "If you share a client portal, invite a collaborator, or publish a link, the people you share with may see the information made available through that feature.",
    ],
  },
  {
    title: "8. Data retention",
    body: [
      "We keep personal data for as long as needed to provide Stage, comply with legal obligations, resolve disputes, enforce agreements, maintain backups, and protect the service.",
      "If you delete your account or ask us to delete personal data, we will delete or anonymize data within a reasonable period unless we need to retain it for legal, security, fraud-prevention, accounting, or legitimate business reasons.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We use reasonable technical and organizational measures designed to protect personal data. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      "You are responsible for keeping your login credentials secure and for controlling who can access your workspace, projects, integrations, and shared client portals.",
    ],
  },
  {
    title: "10. International transfers",
    body: [
      "Stage is operated from Singapore and uses service providers that may process data in other countries. Where required, we use appropriate safeguards for international transfers of personal data.",
    ],
  },
  {
    title: "11. Your rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to the processing of your personal data. You may also have the right to withdraw consent where processing is based on consent.",
      `To exercise these rights, contact us at ${SUPPORT_EMAIL}. We may need to verify your identity before responding.`,
    ],
  },
  {
    title: "12. Children",
    body: [
      "Stage is not intended for children under 13, and we do not knowingly collect personal data from children under 13. If you believe a child has provided personal data to Stage, contact us so we can take appropriate action.",
    ],
  },
  {
    title: "13. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. If changes are material, we will take reasonable steps to notify you, such as by email or an in-product notice. The effective date above shows when this policy was last updated.",
    ],
  },
  {
    title: "14. Governing law",
    body: [
      "This Privacy Policy is governed by the laws of Singapore, except where applicable data protection laws provide otherwise.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      `Questions about this Privacy Policy can be sent to ${SUPPORT_EMAIL}.`,
      `${COMPANY_NAME}, ${COMPANY_ADDRESS}. UEN: ${COMPANY_UEN}.`,
    ],
  },
];

const pageCopy: Record<
  LegalPageKind,
  {
    eyebrow: string;
    title: string;
    description: string;
    sections: LegalSection[];
  }
> = {
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    description:
      "The terms that govern your access to and use of Stage, including accounts, subscriptions, client portals, integrations, and third-party tools.",
    sections: termsSections,
  },
  privacy: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    description:
      "How Stage collects, uses, shares, and protects personal data across the website, product, desktop app, client portals, and integrations.",
    sections: privacySections,
  },
};

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const copy = pageCopy[kind];
  const canonicalPath = kind === "terms" ? "/terms" : "/privacy";
  const canonicalUrl =
    typeof window === "undefined"
      ? `https://getstage.co${canonicalPath}`
      : new URL(canonicalPath, window.location.origin).toString();

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{copy.title} — Stage</title>
        <meta name="description" content={copy.description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${copy.title} — Stage`} />
        <meta property="og:description" content={copy.description} />
        <meta property="og:url" content={canonicalUrl} />
      </Helmet>

      <div className="legal-page">
        <header className="legal-header">
          <div className="landing-container legal-header-inner">
            <Link to="/" className="legal-logo" aria-label="Stage home">
              <img src={stageLogo} alt="Stage" />
            </Link>
            <nav className="legal-nav" aria-label="Legal navigation">
              <Link to="/terms" className="legal-nav-link">
                Terms
              </Link>
              <Link to="/privacy" className="legal-nav-link">
                Privacy
              </Link>
              <Link to="/auth" className="legal-nav-cta">
                Sign in
              </Link>
            </nav>
          </div>
        </header>

        <main className="landing-container legal-main">
          <div className="legal-hero">
            <span className="legal-eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
            <div className="legal-meta">
              <span>Effective date: {EFFECTIVE_DATE}</span>
              <span>{COMPANY_NAME}</span>
            </div>
          </div>

          <article className="legal-document" aria-label={copy.title}>
            {copy.sections.map((section) => (
              <section key={section.title} className="legal-section">
                <h2>{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
