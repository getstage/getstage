import type { ReactNode } from "react";
import { LandingOverlays } from "@/components/stage-landing/markup/LandingOverlays";
import { Navigation } from "@/components/stage-landing/markup/Navigation";
import { SiteFooter } from "@/components/stage-landing/markup/SiteFooter";
import { useStageLanding } from "@/components/stage-landing/useStageLanding";
import { LEGAL_META } from "@/marketing/pageMeta";

const EFFECTIVE_DATE = "November 14, 2026";
const COMPANY_NAME = "Logiaweb Pte. Ltd.";
const COMPANY_ADDRESS = "68 Circular Road #02-01, 049422, Singapore";
const COMPANY_UEN = "202452099Z";
const SUPPORT_EMAIL = "support@getstage.co";

type LegalSection = {
  title: string;
  body?: string[];
  bullets?: string[];
  extra?: ReactNode;
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
      "Stage is a product planning workspace for websites, web apps and iOS apps. It runs the design process that comes before the build: Research, Strategy, Moodboard and Style guide, Flows and Wireframes. It then gives you a build brief that coding agents such as Cursor, Claude Code and Codex can follow. Stage also offers client portals, exports to tools such as Figma, Paper and Notion, and an MCP server that lets AI tools you connect work in your Stage projects.",
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
      "Paid plans include a monthly amount of AI credits. Features such as Research runs and moodboard imports use these credits, including when they run through an AI tool you have connected to Stage.",
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
      "Stage may let you connect third-party services such as Figma, Notion, Stripe, Google Sheets, Claude, ChatGPT, Codex, Cursor, and similar tools. Your use of those services is also governed by their own terms and privacy policies.",
      "When you choose to use an integration, Stage may send or receive the information necessary to provide the requested feature. For example, this may include project metadata, files, task information, shared URLs, payment records, or selected project context.",
      "For AI and coding-agent workflows, Stage may pass selected context to the third-party tool you choose so that tool can perform the requested action. Stage does not store that transient tool context unless you save the resulting content, output, metadata, or artifact back into Stage.",
    ],
    extra: (
      <>
        <p><strong>AI tools connected through MCP.</strong> You can connect Stage to AI tools such as Claude, ChatGPT, Codex and Cursor through Stage's MCP server. When you connect, you choose which workspaces and permissions the AI tool can use.</p>
        <p>A connected AI tool acts on your behalf. Actions it takes in Stage, such as creating projects, saving steps or importing images, are treated as your actions, and any credits they use count against your plan. Some actions replace the saved result of a step, so review what your AI tool proposes before you approve it.</p>
        <p>Your use of a connected AI tool is governed by its provider's terms. Stage is not responsible for the content an AI tool generates. You can disconnect an AI tool at any time from that tool's settings.</p>
      </>
    ),
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
      "Integration information from third-party services you connect, such as Figma, Notion, Stripe, Google Sheets, Claude, ChatGPT, Codex, Cursor, and similar tools.",
      "Connector information, such as the AI tools you connect to Stage, the workspaces and permissions you grant them, records of the access tokens that keep the connection working, and the requests they make to Stage.",
      "Usage, device, and log information, such as IP address, browser, device type, pages viewed, product interactions, diagnostic logs, and security events.",
      "Support communications and feedback you send to us.",
    ],
  },
  {
    title: "3. AI tools and MCP connectors",
    body: [
      "You can connect Stage to third-party AI tools, including Claude (by Anthropic), ChatGPT and Codex (by OpenAI) and Cursor, through Stage's MCP server at mcp.getstage.co. Connecting uses OAuth: you sign in to Stage and choose which workspaces and permissions the AI tool can use. Stage stores records of the access tokens issued to keep that connection working.",
      "Stage only receives what the AI tool sends when it uses a Stage tool, such as project details, research inputs, search queries, image links and the step results it asks Stage to save. Stage does not request or receive your full conversation, your chat history or the AI tool's memory.",
      "Stage sends back the project information each request asks for, such as your projects, saved steps and build brief. The AI provider then processes that information under its own terms and privacy policy.",
      "Results saved through a connector become part of your project, like any other project content. Stage keeps limited technical logs of connector activity for security, credit accounting and support.",
      "When you ask Stage to send project context to an AI or coding-agent tool from inside Stage, for example during an export, Stage does not store that transient context unless you save the resulting content, output, metadata or artifacts back into Stage.",
      "To end access, remove Stage from the AI tool's connector settings, or contact us to revoke all connections.",
    ],
  },
  {
    title: "4. Reference screens",
    body: [
      "When you search for reference screens or run Research, Stage sends your search query and the screen types you chose to Refero (app and web screens) and Details (website sections) to find real product screens. Stage sends them the query, not your account details.",
      "When you add images to a moodboard, Stage downloads and stores its own copy of the images you choose, including images from links you provide or from a Figma account you have connected.",
    ],
  },
  {
    title: "5. How we use information",
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
    title: "6. Third-party providers",
    body: [
      "We use third-party providers to operate Stage. These providers may process personal data only as needed to provide their services to us or to you.",
      "Examples include hosting and backend infrastructure, authentication, file storage, payment processing, email delivery, analytics, customer support, and user-selected integrations such as Figma and Notion.",
      "When you connect a third-party service, you authorize Stage to exchange the information required for that integration. You can usually disconnect integrations from Stage settings or from the third-party service.",
    ],
  },
  {
    title: "7. Analytics and cookies",
    body: [
      "Stage may use cookies, local storage, and similar technologies to keep you signed in, remember preferences, secure the service, understand usage, and improve the product.",
      "We use analytics tools, including DataFast, to understand how Stage is used and which product or marketing activities are effective. You can control cookies through your browser settings, though some features may not work correctly without them.",
    ],
  },
  {
    title: "8. How we share information",
    body: [
      "We do not sell your personal data. We may share information with service providers, payment processors, integration providers you choose to connect, AI tools you connect to Stage, professional advisors, authorities where legally required, and parties involved in a business transfer such as a merger or acquisition.",
      "If you share a client portal, invite a collaborator, or publish a link, the people you share with may see the information made available through that feature.",
    ],
  },
  {
    title: "9. Data retention",
    body: [
      "We keep personal data for as long as needed to provide Stage, comply with legal obligations, resolve disputes, enforce agreements, maintain backups, and protect the service.",
      "When you delete your account, we delete or anonymize your personal data within 30 days. Backups are overwritten within 90 days. We keep billing records for as long as tax and accounting law requires.",
      "If you ask us to delete personal data without deleting your account, we will delete or anonymize data within a reasonable period unless we need to retain it for legal, security, fraud-prevention, accounting, or legitimate business reasons.",
    ],
  },
  {
    title: "10. Security",
    body: [
      "We use reasonable technical and organizational measures designed to protect personal data. However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      "You are responsible for keeping your login credentials secure and for controlling who can access your workspace, projects, integrations, and shared client portals.",
    ],
  },
  {
    title: "11. International transfers",
    body: [
      "Stage is operated from Singapore and uses service providers that may process data in other countries. Where required, we use appropriate safeguards for international transfers of personal data.",
    ],
  },
  {
    title: "12. Your rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to the processing of your personal data. You may also have the right to withdraw consent where processing is based on consent.",
      `To exercise these rights, contact us at ${SUPPORT_EMAIL}. We may need to verify your identity before responding.`,
    ],
  },
  {
    title: "13. Children",
    body: [
      "Stage is not intended for children under 13, and we do not knowingly collect personal data from children under 13. If you believe a child has provided personal data to Stage, contact us so we can take appropriate action.",
    ],
  },
  {
    title: "14. Changes to this Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time. If changes are material, we will take reasonable steps to notify you, such as by email or an in-product notice. The effective date above shows when this policy was last updated.",
    ],
  },
  {
    title: "15. Governing law",
    body: [
      "This Privacy Policy is governed by the laws of Singapore, except where applicable data protection laws provide otherwise.",
    ],
  },
  {
    title: "16. Contact",
    body: [
      `Questions about this Privacy Policy can be sent to ${SUPPORT_EMAIL}.`,
      `${COMPANY_NAME}, ${COMPANY_ADDRESS}. UEN: ${COMPANY_UEN}.`,
    ],
  },
];

const pageCopy = {
  terms: { eyebrow: "Legal", sections: termsSections },
  privacy: { eyebrow: "Privacy", sections: privacySections },
};

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const { eyebrow, sections } = pageCopy[kind];
  const { title, description } = LEGAL_META[kind];

  useStageLanding({ bodyClass: "legal-page" });

  return (
    <>
      <div id="top" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation />
      <main className="legal-main" id="main">
        <div className="legal-content">
          <header className="legal-hero">
            <span className="legal-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
            <nav className="legal-switch" aria-label="Legal documents">
              <a href="/terms" aria-current={kind === "terms" ? "page" : undefined}>
                Terms
              </a>
              <a href="/privacy" aria-current={kind === "privacy" ? "page" : undefined}>
                Privacy
              </a>
            </nav>
            <div className="legal-meta">
              <span>Effective date: {EFFECTIVE_DATE}</span>
              <span>{COMPANY_NAME}</span>
            </div>
          </header>

          <article className="legal-document" aria-label={title}>
            {sections.map((section) => (
              <section key={section.title} className="legal-section">
                <h2>{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.extra}
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
        </div>
      </main>
      <SiteFooter />
      <LandingOverlays />
    </>
  );
}
