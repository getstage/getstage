import * as React from "react";

type Overlay =
  | {
      id: string;
      type: "arrow";
      points: [number, number, number, number];
      color: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      radius: number;
      color: string;
      strokeWidth: number;
    }
  | {
      id: string;
      type: "hide";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      text: string;
      fontSize: number;
      fontFamily?: string;
      fill: string;
      width?: number;
      rotation?: number;
    };

type SourceStep = {
  readonly id: string;
  readonly imageKey?: string | null;
  readonly overlays?: readonly Overlay[];
};

type DocsStep = {
  stepId: string;
  anchorId: string;
  title: string;
  bodyMd: string;
  calloutMd?: string;
  imageMode: "full" | "none";
};

type DocsContent = {
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  hero: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    estimatedMinutes?: number;
    heroStepId?: string;
  };
  overview: {
    summaryMd: string;
  };
  gettingStarted: {
    bullets: string[];
  };
  requirements?: {
    items: string[];
  };
  steps: DocsStep[];
  troubleshooting?: {
    items: Array<{
      problem: string;
      resolutionMd: string;
    }>;
  };
  faq?: {
    items: Array<{
      question: string;
      answerMd: string;
    }>;
  };
};

const GUIDE: {
  readonly title: string;
  readonly brandImageKey: string;
  readonly steps: readonly SourceStep[];
} = {
  "title": "Import transactions via Google Sheets",
  "brandImageKey": "https://assets.stepps.ai/brand-logos/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/1773067497926.png",
  "steps": [
    {
      "id": "324a2a8c-36a7-411a-a3d5-5b0341758d09",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/324a2a8c-36a7-411a-a3d5-5b0341758d09.webp",
      "overlays": []
    },
    {
      "id": "e804fb88-4cdf-490e-94f6-aa304005876f",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/e804fb88-4cdf-490e-94f6-aa304005876f.webp",
      "overlays": []
    },
    {
      "id": "8a59b3e1-7cf1-49a3-a674-35afb51f7027",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/8a59b3e1-7cf1-49a3-a674-35afb51f7027.webp",
      "overlays": [
        {
          "id": "annotation-1773067121454-phrm8z1i3",
          "type": "arrow",
          "color": "#6366f1",
          "points": [
            61.767578125,
            46.81762292107974,
            25.927734375,
            73.07268643018897
          ],
          "strokeWidth": 4
        }
      ]
    },
    {
      "id": "3e49f10f-b470-4701-ab67-c0cb647db674",
      "imageKey": null,
      "overlays": []
    },
    {
      "id": "178b2573-56f7-43b2-b7ff-1b3b7a5b42be",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/178b2573-56f7-43b2-b7ff-1b3b7a5b42be.webp",
      "overlays": [
        {
          "id": "annotation-1773067136991-nb1gn74e4",
          "type": "arrow",
          "color": "#6366f1",
          "points": [
            64.697265625,
            40.947133975356294,
            77.685546875,
            45.61430507851356
          ],
          "strokeWidth": 4
        }
      ]
    },
    {
      "id": "dd4322d8-a04a-41e2-8c48-a20f75dcb5d8",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/dd4322d8-a04a-41e2-8c48-a20f75dcb5d8.webp",
      "overlays": [
        {
          "id": "annotation-1773067152046-4iin3smqr",
          "type": "arrow",
          "color": "#6366f1",
          "points": [
            62.060546875,
            50.139348030294094,
            71.728515625,
            69.8856026744315
          ],
          "strokeWidth": 4
        }
      ]
    },
    {
      "id": "c9be6590-147a-49c0-9162-1678b9023af5",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/c9be6590-147a-49c0-9162-1678b9023af5.webp",
      "overlays": [
        {
          "id": "annotation-1773067928680-6mr5hgeur",
          "type": "arrow",
          "color": "#6366f1",
          "points": [
            63.427734375,
            25.101991192746652,
            46.142578125,
            27.27132522780215
          ],
          "strokeWidth": 4
        }
      ]
    },
    {
      "id": "b44d568f-84b7-4a1c-bf5c-eea386666233",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/b44d568f-84b7-4a1c-bf5c-eea386666233.webp",
      "overlays": []
    },
    {
      "id": "f0c57174-6910-452f-80c3-267bc8799a44",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/f0c57174-6910-452f-80c3-267bc8799a44.webp",
      "overlays": [
        {
          "id": "annotation-1773068022242-3028v0tlm",
          "type": "arrow",
          "color": "#6366f1",
          "points": [
            73.71653746490409,
            62.031856532326934,
            68.78448716856643,
            76.34152562200991
          ],
          "strokeWidth": 4
        }
      ]
    },
    {
      "id": "4f606e72-3a0d-424a-a0cb-d38ac5cfb00a",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/VyB2oKDo0EtCinV36VKMnOdKLiFZVy5i/4f606e72-3a0d-424a-a0cb-d38ac5cfb00a.webp",
      "overlays": []
    },
    {
      "id": "db1cbd0f-337c-40fc-b7c8-d91e185b5013",
      "imageKey": "https://assets.stepps.ai/screenshots/93fb9ba1-c1ed-4034-bfce-7884ac07ae47/1773068100035-db1cbd0f-337c-40fc-b7c8-d91e185b5013.png",
      "overlays": []
    }
  ]
} as const;
const CONTENT = {
  "seo": {
    "metaTitle": "Import transactions via Google Sheets - Stage Help Guide",
    "metaDescription": "Learn how to import transactions into Stage using Google Sheets. Follow this step-by-step guide to connect your spreadsheet and sync your financial data."
  },
  "hero": {
    "eyebrow": "Stage",
    "title": "Import transactions via Google Sheets",
    "subtitle": "Connect your Google Sheets to Stage to import and sync your transactions automatically.",
    "estimatedMinutes": 17,
    "heroStepId": "324a2a8c-36a7-411a-a3d5-5b0341758d09"
  },
  "overview": {
    "summaryMd": "This guide walks you through connecting a Google Sheets document to Stage so you can import your transactions. You'll make a copy of our template, share it publicly, and link it to Stage."
  },
  "gettingStarted": {
    "bullets": [
      "You'll need a Google account to create and share your sheet",
      "Make sure your transactions follow the required column format",
      "Any client or project referenced must already exist in Stage"
    ]
  },
  "steps": [
    {
      "stepId": "324a2a8c-36a7-411a-a3d5-5b0341758d09",
      "anchorId": "1-make-a-copy-of-the-template",
      "title": "Make a copy of the template",
      "bodyMd": "Open the Google Sheets template provided by Stage. Go to **File** in the menu, then select **Make a Copy** to create your own version of the spreadsheet that you can edit.",
      "calloutMd": "Use the screenshot and annotations to confirm you are clicking or checking the right UI element.",
      "imageMode": "full"
    },
    {
      "stepId": "e804fb88-4cdf-490e-94f6-aa304005876f",
      "anchorId": "2-go-to-the-transactions-page",
      "title": "Go to the transactions page",
      "bodyMd": "Navigate to the Transactions tab in your copied spreadsheet. This is where your transaction data will be entered and where Stage will look for data to import.",
      "calloutMd": "Make sure you're on the Transactions tab before proceeding.",
      "imageMode": "full"
    },
    {
      "stepId": "8a59b3e1-7cf1-49a3-a674-35afb51f7027",
      "anchorId": "3-share-the-sheet-and-copy-the-url",
      "title": "Share the sheet and copy the URL",
      "bodyMd": "Click the **Share** button in the top right corner. Under \"General access,\" change the setting to **Anyone with the link** and set it to **Viewer**. Then copy the full URL from your browser address bar.",
      "calloutMd": "The sheet must be publicly accessible for Stage to read the data.",
      "imageMode": "full"
    },
    {
      "stepId": "3e49f10f-b470-4701-ab67-c0cb647db674",
      "anchorId": "4-verify-the-url-format",
      "title": "Verify the URL format",
      "bodyMd": "Check that your URL follows the correct format. It should look something like: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit?gid=[TAB_GID]#gid=[TAB_GID]`. This confirms the sheet is properly shared.",
      "calloutMd": "The URL must include the full path with the sheet ID and tab ID.",
      "imageMode": "none"
    },
    {
      "stepId": "178b2573-56f7-43b2-b7ff-1b3b7a5b42be",
      "anchorId": "5-open-settings",
      "title": "Open Settings",
      "bodyMd": "In Stage, click on **Settings** to access the integration settings where you can connect external tools.",
      "calloutMd": "Use the screenshot and annotations to confirm you are clicking or checking the right UI element.",
      "imageMode": "full"
    },
    {
      "stepId": "dd4322d8-a04a-41e2-8c48-a20f75dcb5d8",
      "anchorId": "6-connect-your-google-sheets-url",
      "title": "Connect your Google Sheets URL",
      "bodyMd": "In the Settings area, find the option to connect a Google Sheets URL. Paste the URL you copied from step 3 into the provided field.",
      "calloutMd": "Use the screenshot and annotations to confirm you are clicking or checking the right UI element.",
      "imageMode": "full"
    },
    {
      "stepId": "c9be6590-147a-49c0-9162-1678b9023af5",
      "anchorId": "7-enter-your-transactions",
      "title": "Enter your transactions",
      "bodyMd": "Delete any existing placeholder rows in the Transactions tab. Start adding your own transaction data in the columns provided, following the header row format.",
      "calloutMd": "Make sure each row has all required fields filled in.",
      "imageMode": "full"
    },
    {
      "stepId": "b44d568f-84b7-4a1c-bf5c-eea386666233",
      "anchorId": "8-review-your-data",
      "title": "Review your data",
      "bodyMd": "Verify that your transactions are entered correctly. Check that dates are in YYYY-MM-DD format, amounts are valid numbers, and all required columns are populated.",
      "calloutMd": "Use the screenshot and annotations to confirm you are clicking or checking the right UI element.",
      "imageMode": "full"
    },
    {
      "stepId": "f0c57174-6910-452f-80c3-267bc8799a44",
      "anchorId": "9-connect-to-google-sheets",
      "title": "Connect to Google Sheets",
      "bodyMd": "Click the **Connect to Google Sheets** button in Stage to establish the connection. Stage will attempt to read the data from your shared spreadsheet.",
      "calloutMd": "Use the screenshot and annotations to confirm you are clicking or checking the right UI element.",
      "imageMode": "full"
    },
    {
      "stepId": "4f606e72-3a0d-424a-a0cb-d38ac5cfb00a",
      "anchorId": "10-match-projects-in-stage",
      "title": "Match projects in Stage",
      "bodyMd": "Ensure that the client and project names in your Google Sheets match exactly with the clients and projects already created in Stage. If a client or project doesn't exist in Stage yet, create it there first before importing.",
      "calloutMd": "Names must match exactly, including spelling and capitalization.",
      "imageMode": "full"
    },
    {
      "stepId": "db1cbd0f-337c-40fc-b7c8-d91e185b5013",
      "anchorId": "11-sync-after-changes",
      "title": "Sync after changes",
      "bodyMd": "Whenever you add, edit, or remove transactions in your Google Sheets, click the sync button in Stage to refresh the imported data. This ensures Stage always has your latest transaction data.",
      "calloutMd": "Remember to sync each time you make changes to keep your data up to date.",
      "imageMode": "full"
    }
  ],
  "troubleshooting": {
    "items": [
      {
        "problem": "Sheet URL issues",
        "resolutionMd": "The sheet must be a public Google Sheet. Open the Transactions tab and copy the full URL from your browser. The URL should be: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<TAB_GID>#gid=<TAB_GID>`"
      },
      {
        "problem": "Share permissions error",
        "resolutionMd": "Go to Share in Google Sheets. Set access to Anyone with the link and set it to Viewer. If it still does not work, try Publish to the web and retry import."
      },
      {
        "problem": "Required column not found",
        "resolutionMd": "Your header row must include: Date, Type, Direction, Client, Amount, Currency, and Status. Keep the Transactions tab as the active tab."
      },
      {
        "problem": "Client or Project not found",
        "resolutionMd": "Make sure the client/project already exists in Stage first. Use the exact spelling and casing used in Stage."
      },
      {
        "problem": "Unsupported values error",
        "resolutionMd": "Type must be: invoice, expense, salary, tax, loan, other, payment, refund, or adjustment. Direction must be: in, incoming, out, or outgoing. Status must be: draft, open, pending, paid, succeeded, complete, overdue, past_due, cancelled, or failed."
      },
      {
        "problem": "Amount or Date errors",
        "resolutionMd": "Amount must be a valid number (e.g. 129.99). Date should be YYYY-MM-DD, for example 2026-03-09."
      },
      {
        "problem": "No data imported",
        "resolutionMd": "Your sheet needs one header row and at least one data row. Remove extra blank rows above the header."
      },
      {
        "problem": "Still not working",
        "resolutionMd": "Try importing only 1–3 rows first. If that works, add more rows in small batches to find the problematic row."
      }
    ]
  }
} as DocsContent;
const STEP_LOOKUP = GUIDE.steps.reduce<Record<string, SourceStep>>(
  (acc, step) => {
    acc[step.id] = step;
    return acc;
  },
  {}
);
const THEME = "light" as const;

const themePalette = THEME === "light"
  ? {
      pageBg: "#ffffff",
      pageText: "#0f172a",
      mutedText: "#334155",
      mutedSubtle: "#64748b",
      panelText: "#1f2937",
      borderStrong: "rgba(15,23,42,0.2)",
      borderSubtle: "rgba(15,23,42,0.12)",
      panelBg: "rgba(15,23,42,0.03)",
      panelBgSubtle: "rgba(15,23,42,0.05)",
      cardBg: "#f8fafc",
      heroViewportBg: "#e5e7eb",
      screenshotShadow: "0 24px 80px rgba(15, 23, 42, 0.18)",
      eyebrow: "#ea580c",
      calloutBorder: "rgba(16, 185, 129, 0.35)",
      calloutBg: "rgba(16, 185, 129, 0.1)",
      calloutText: "#166534",
      overlayFallbackText: "#0f172a",
      sectionText: "#334155",
      headerBg: "rgba(255,255,255,0.95)",
      headerText: "#0f172a",
    }
  : {
      pageBg: "#0a0f1a",
      pageText: "#ffffff",
      mutedText: "#cbd5e1",
      mutedSubtle: "#94a3b8",
      panelText: "#e2e8f0",
      borderStrong: "rgba(255,255,255,0.08)",
      borderSubtle: "rgba(255,255,255,0.1)",
      panelBg: "rgba(255,255,255,0.04)",
      panelBgSubtle: "rgba(255,255,255,0.04)",
      cardBg: "#111827",
      heroViewportBg: "#0f172a",
      screenshotShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
      eyebrow: "#fdba74",
      calloutBorder: "rgba(16, 185, 129, 0.24)",
      calloutBg: "rgba(16, 185, 129, 0.08)",
      calloutText: "#d1fae5",
      overlayFallbackText: "#ffffff",
      sectionText: "#cbd5e1",
      headerBg: "rgba(10,15,26,0.9)",
      headerText: "#ffffff",
    };

const styles = {
  page: {
    minHeight: "100vh",
    background: themePalette.pageBg,
    color: themePalette.pageText,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 20,
    backdropFilter: "blur(14px)",
    background: themePalette.headerBg,
    borderBottom: "1px solid " + themePalette.borderStrong,
  },
  headerInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "18px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    objectFit: "cover" as const,
    border: "1px solid " + themePalette.borderSubtle,
  },
  brandEyebrow: {
    fontSize: 12,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: themePalette.mutedSubtle,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: themePalette.headerText,
  },
  headerBadge: {
    border: "1px solid " + themePalette.borderSubtle,
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 13,
    color: themePalette.mutedText,
    textDecoration: "none",
  },
  layout: {
    maxWidth: 1280,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr)",
    gap: 40,
    padding: "40px 24px 64px",
  },
  aside: {
    position: "sticky" as const,
    top: 100,
    alignSelf: "start" as const,
    borderRadius: 28,
    border: "1px solid " + themePalette.borderSubtle,
    background: themePalette.panelBgSubtle,
    padding: 16,
  },
  tocList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  tocLink: {
    color: themePalette.mutedText,
    textDecoration: "none",
    fontSize: 15,
    lineHeight: 1.45,
    display: "block",
    padding: "8px 10px",
    borderRadius: 12,
  },
  tocLinkNested: {
    paddingLeft: 22,
    fontSize: 14,
    color: themePalette.mutedSubtle,
  },
  main: {
    minWidth: 0,
  },
  section: {
    marginBottom: 56,
    scrollMarginTop: 96,
  },
  heroTitle: {
    fontSize: "clamp(2.4rem, 6vw, 4rem)",
    lineHeight: 1.02,
    margin: "0 0 16px",
    fontWeight: 700,
    letterSpacing: "-0.04em",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.24em",
    textTransform: "uppercase" as const,
    color: themePalette.eyebrow,
    marginBottom: 16,
  },
  subtitle: {
    maxWidth: 780,
    fontSize: 18,
    lineHeight: 1.7,
    color: themePalette.mutedText,
  },
  heroMeta: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 16,
    marginTop: 18,
    fontSize: 14,
    color: themePalette.mutedSubtle,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: 650,
    margin: "0 0 16px",
    letterSpacing: "-0.03em",
  },
  paragraphWrap: {
    display: "grid",
    gap: 14,
    maxWidth: 820,
  },
  paragraph: {
    margin: 0,
    whiteSpace: "pre-wrap" as const,
    color: themePalette.sectionText,
    lineHeight: 1.75,
    fontSize: 16,
  },
  panel: {
    borderRadius: 28,
    border: "1px solid " + themePalette.borderStrong,
    background: themePalette.panelBg,
    padding: 24,
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    display: "grid",
    gap: 12,
    color: themePalette.sectionText,
  },
  listItem: {
    lineHeight: 1.7,
  },
  stepsWrap: {
    display: "grid",
    gap: 48,
  },
  stepHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  stepNumber: {
    width: 36,
    height: 36,
    minWidth: 36,
    borderRadius: 999,
    border: "1px solid " + themePalette.borderSubtle,
    background: themePalette.panelBgSubtle,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: themePalette.pageText,
  },
  stepTitle: {
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 650,
    margin: "0 0 12px",
    letterSpacing: "-0.03em",
  },
  screenshotCard: {
    position: "relative" as const,
    borderRadius: 28,
    border: "1px solid " + themePalette.borderStrong,
    background: themePalette.cardBg,
    padding: 16,
    marginTop: 18,
    boxShadow: themePalette.screenshotShadow,
  },
  screenshotViewport: {
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: 18,
    background: themePalette.heroViewportBg,
  },
  screenshotImage: {
    display: "block",
    width: "100%",
    height: "auto",
  },
  screenshotSvg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "visible" as const,
    pointerEvents: "none" as const,
  },
  callout: {
    marginTop: 18,
    borderRadius: 20,
    border: "1px solid " + themePalette.calloutBorder,
    background: themePalette.calloutBg,
    padding: 18,
  },
  calloutText: {
    color: themePalette.calloutText,
  },
  issueCard: {
    borderRadius: 24,
    border: "1px solid " + themePalette.borderStrong,
    background: themePalette.panelBgSubtle,
    padding: 24,
    marginTop: 16,
  },
  issueTitle: {
    margin: "0 0 12px",
    fontSize: 20,
    fontWeight: 600,
  },
  issueText: {
    color: themePalette.sectionText,
  },
} as const;

function renderParagraphs(value?: string, style?: React.CSSProperties) {
  if (!value || !value.trim()) return null;

  return value
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} style={{ ...styles.paragraph, ...style }}>
        {paragraph.trim()}
      </p>
    ));
}

// Convert percentage-based overlay to pixel coords (same logic as viewer-canvas overlayToPixels)
function overlayToPixels(overlay: Overlay, width: number, height: number) {
  const minDim = Math.min(width, height);

  if (overlay.type === "arrow") {
    return {
      ...overlay,
      points: [
        (overlay.points[0] / 100) * width,
        (overlay.points[1] / 100) * height,
        (overlay.points[2] / 100) * width,
        (overlay.points[3] / 100) * height,
      ] as [number, number, number, number],
    };
  }

  if (overlay.type === "circle") {
    return {
      ...overlay,
      x: (overlay.x / 100) * width,
      y: (overlay.y / 100) * height,
      radius: (overlay.radius || 2.5) * (minDim / 100),
    };
  }

  if (overlay.type === "hide") {
    return {
      ...overlay,
      x: (overlay.x / 100) * width,
      y: (overlay.y / 100) * height,
      width: (overlay.width / 100) * width,
      height: (overlay.height / 100) * height,
    };
  }

  if (overlay.type === "text") {
    return {
      ...overlay,
      x: (overlay.x / 100) * width,
      y: (overlay.y / 100) * height,
    };
  }

  return overlay;
}

function renderOverlay(overlay: Overlay, index: number) {
  if (overlay.type === "arrow") {
    const markerId = `arrowhead-${overlay.id || index}`;
    return (
      <g key={overlay.id || `arrow-${index}`}>
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L0,8 L8,4 z" fill={overlay.color || "#4f46e5"} />
          </marker>
        </defs>
        <line
          x1={overlay.points[0]}
          y1={overlay.points[1]}
          x2={overlay.points[2]}
          y2={overlay.points[3]}
          stroke={overlay.color || "#4f46e5"}
          strokeWidth={overlay.strokeWidth || 4}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </g>
    );
  }

  if (overlay.type === "circle") {
    return (
      <circle
        key={overlay.id || `circle-${index}`}
        cx={overlay.x}
        cy={overlay.y}
        r={overlay.radius}
        fill="none"
        stroke={overlay.color || "#f59e0b"}
        strokeWidth={overlay.strokeWidth || 3}
      />
    );
  }

  if (overlay.type === "hide") {
    return (
      <rect
        key={overlay.id || `hide-${index}`}
        x={overlay.width < 0 ? overlay.x + overlay.width : overlay.x}
        y={overlay.height < 0 ? overlay.y + overlay.height : overlay.y}
        width={Math.abs(overlay.width)}
        height={Math.abs(overlay.height)}
        rx="2"
        fill={overlay.color || "#000000"}
        opacity="0.92"
      />
    );
  }

  if (overlay.type === "text") {
    return (
      <text
        key={overlay.id || `text-${index}`}
        x={overlay.x}
        y={overlay.y}
        fill={overlay.fill || themePalette.overlayFallbackText}
        fontSize={overlay.fontSize || 20}
        fontFamily={overlay.fontFamily || "Arial"}
        transform={overlay.rotation ? `rotate(${overlay.rotation} ${overlay.x} ${overlay.y})` : undefined}
      >
        {overlay.text}
      </text>
    );
  }

  return null;
}

function DocsScreenshot({ step, alt }: { step?: SourceStep; alt: string }) {
  const [dims, setDims] = React.useState<{ w: number; h: number } | null>(null);

  if (!step?.imageKey) return null;

  const pixelOverlays =
    dims && Array.isArray(step.overlays) && step.overlays.length > 0
      ? step.overlays.map((o) => overlayToPixels(o, dims.w, dims.h))
      : [];

  return (
    <div style={styles.screenshotCard}>
      <div style={styles.screenshotViewport}>
        <img
          src={step.imageKey}
          alt={alt}
          style={styles.screenshotImage}
          onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            setDims({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
        {dims && pixelOverlays.length > 0 ? (
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={styles.screenshotSvg}
          >
            {pixelOverlays.map((overlay, index) => renderOverlay(overlay, index))}
          </svg>
        ) : null}
      </div>
    </div>
  );
}

function DocsHero() {
  const heroStep =
    (CONTENT.hero.heroStepId ? STEP_LOOKUP[CONTENT.hero.heroStepId] : undefined) ||
    GUIDE.steps.find((step) => Boolean(step.imageKey));

  return (
    <section style={styles.section}>
      {CONTENT.hero.eyebrow ? <div style={styles.eyebrow}>{CONTENT.hero.eyebrow}</div> : null}
      <h1 style={styles.heroTitle}>{CONTENT.hero.title}</h1>
      <div style={styles.subtitle}>{renderParagraphs(CONTENT.hero.subtitle, { fontSize: 18 })}</div>
      <div style={styles.heroMeta}>
        {CONTENT.hero.estimatedMinutes ? <span>{CONTENT.hero.estimatedMinutes} min read</span> : null}
        <span>{CONTENT.steps.length} detailed steps</span>
      </div>
      <DocsScreenshot step={heroStep} alt={CONTENT.hero.title} />
    </section>
  );
}

function DocsOverview() {
  return (
    <section id="overview" style={styles.section}>
      <h2 style={styles.sectionTitle}>Overview</h2>
      <div style={styles.paragraphWrap}>{renderParagraphs(CONTENT.overview.summaryMd)}</div>
    </section>
  );
}

function DocsGettingStarted() {
  if (!CONTENT.gettingStarted.bullets.length) return null;

  return (
    <section id="getting-started" style={styles.section}>
      <h2 style={styles.sectionTitle}>Get started</h2>
      <div style={styles.panel}>
        <ol style={styles.list}>
          {CONTENT.gettingStarted.bullets.map((bullet, index) => (
            <li key={index} style={styles.listItem}>
              {bullet.replace(/^\d+\.\s*/, "")}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DocsRequirements() {
  if (!CONTENT.requirements?.items?.length) return null;

  return (
    <section id="requirements" style={styles.section}>
      <h2 style={styles.sectionTitle}>Requirements</h2>
      <div style={styles.panel}>
        <ul style={styles.list}>
          {CONTENT.requirements.items.map((item, index) => (
            <li key={index} style={styles.listItem}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DocsSteps() {
  return (
    <section id="steps" style={styles.section}>
      <h2 style={styles.sectionTitle}>Detailed steps</h2>
      <div style={styles.stepsWrap}>
        {CONTENT.steps.map((step, index) => {
          const sourceStep = STEP_LOOKUP[step.stepId];
          return (
            <section key={step.stepId} id={step.anchorId} style={{ scrollMarginTop: 96 }}>
              <div style={styles.stepHeader}>
                <div style={styles.stepNumber}>{index + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={styles.stepTitle}>{step.title}</h3>
                  <div style={styles.paragraphWrap}>{renderParagraphs(step.bodyMd)}</div>
                </div>
              </div>
              {step.imageMode === "full" ? <DocsScreenshot step={sourceStep} alt={step.title} /> : null}
              {step.calloutMd ? (
                <div style={styles.callout}>
                  <div style={styles.paragraphWrap}>
                    {renderParagraphs(step.calloutMd, { color: themePalette.calloutText })}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function DocsTroubleshooting() {
  if (!CONTENT.troubleshooting?.items?.length) return null;

  return (
    <section id="troubleshooting" style={styles.section}>
      <h2 style={styles.sectionTitle}>Troubleshooting</h2>
      {CONTENT.troubleshooting.items.map((item, index) => (
        <div key={index} style={styles.issueCard}>
          <h3 style={styles.issueTitle}>{item.problem}</h3>
          <div style={styles.paragraphWrap}>{renderParagraphs(item.resolutionMd)}</div>
        </div>
      ))}
    </section>
  );
}

function DocsFaq() {
  if (!CONTENT.faq?.items?.length) return null;

  return (
    <section id="faq" style={styles.section}>
      <h2 style={styles.sectionTitle}>FAQ</h2>
      {CONTENT.faq.items.map((item, index) => (
        <div key={index} style={styles.issueCard}>
          <h3 style={styles.issueTitle}>{item.question}</h3>
          <div style={styles.paragraphWrap}>{renderParagraphs(item.answerMd)}</div>
        </div>
      ))}
    </section>
  );
}

export default function GuideImportTransactionsViaGoogleSheetsDocs() {
  const tocItems = React.useMemo(
    () => [
      { id: "overview", label: "Overview", nested: false },
      { id: "getting-started", label: "Get started", nested: false },
      ...(CONTENT.requirements?.items?.length ? [{ id: "requirements", label: "Requirements", nested: false }] : []),
      { id: "steps", label: "Detailed steps", nested: false },
      ...CONTENT.steps.map((step) => ({ id: step.anchorId, label: step.title, nested: true })),
      ...(CONTENT.troubleshooting?.items?.length ? [{ id: "troubleshooting", label: "Troubleshooting", nested: false }] : []),
      ...(CONTENT.faq?.items?.length ? [{ id: "faq", label: "FAQ", nested: false }] : []),
    ],
    []
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            {GUIDE.brandImageKey ? (
              <img src={GUIDE.brandImageKey} alt="Brand" style={styles.brandImage} />
            ) : null}
            <div>
              <div style={styles.headerTitle}>{GUIDE.title}</div>
              <div style={styles.brandEyebrow}>Documentation</div>
            </div>
          </div>
          <a href="https://stepps.ai" target="_blank" rel="noreferrer" style={styles.headerBadge}>
            Powered by Stepps
          </a>
        </div>
      </header>

      <div style={styles.layout}>
        <aside style={styles.aside}>
          <ul style={styles.tocList}>
            {tocItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  style={{
                    ...styles.tocLink,
                    ...(item.nested ? styles.tocLinkNested : {}),
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main style={styles.main}>
          <DocsHero />
          <DocsOverview />
          <DocsGettingStarted />
          <DocsRequirements />
          <DocsSteps />
          <DocsTroubleshooting />
          <DocsFaq />
        </main>
      </div>
    </div>
  );
}