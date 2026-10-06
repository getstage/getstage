import type {
  AssetsArtifact,
  FlowsArtifact,
  MoodboardArtifact,
  ResearchArtifact,
  StrategyArtifact,
  WireframesArtifact,
} from "@stage/data-ops/contracts";
import type {
  ProjectExportAsset,
  ProjectExportFile,
} from "@shared/models/desktop";
import {
  assetsMarkdown,
  flowsMarkdown,
  moodboardMarkdown,
  researchMarkdown,
  strategyMarkdown,
  styleGuideMarkdown,
  wireframesMarkdown,
} from "./projectExportMarkdown";
import {
  COMPONENT_PACK_CATALOG,
  DISCOVER_SKILL_CATALOG,
} from "../settings/skillsCatalog";

export const PROJECT_EXPORT_SECTIONS = [
  "research",
  "strategy",
  "moodboard",
  "styleGuide",
  "flows",
  "wireframes",
  "assets",
] as const;

export type ProjectExportSection = (typeof PROJECT_EXPORT_SECTIONS)[number];

/** True only when a Lo-Fi artifact has at least one generated block. */
export function hasExportableWireframes(
  artifact: WireframesArtifact | null | undefined,
) {
  return Boolean(
    artifact?.wireframeKind === "lofi" &&
      artifact.generatedScreens.some((screen) =>
        screen.sections?.some((section) => (section.blocks?.length ?? 0) > 0),
      ),
  );
}

export type ProjectExportArtifacts = {
  research?: ResearchArtifact | null;
  strategy?: StrategyArtifact | null;
  moodboard?: MoodboardArtifact | null;
  flows?: FlowsArtifact | null;
  wireframes?: WireframesArtifact | null;
  assets?: AssetsArtifact | null;
};

export type ProjectUploadedAsset = {
  title: string;
  url: string | null;
  mimeType?: string;
};

type BuildProjectExportInput = {
  project: {
    name: string;
    clientName: string;
    typeLabel: string;
  };
  selected: ReadonlySet<ProjectExportSection>;
  artifacts: ProjectExportArtifacts;
  uploadedAssets: ProjectUploadedAsset[];
  skillIds?: readonly string[];
  componentPackIds?: readonly string[];
  importedItems?: readonly {
    id: string;
    kind: "skill" | "component";
    name: string;
    sourceUrl: string;
  }[];
};

function safeStem(value: string) {
  const stem = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || "asset";
}

function extensionFrom(value: string) {
  const cleanValue = value.split(/[?#]/, 1)[0] ?? value;
  const match = cleanValue.match(/(\.[a-zA-Z0-9]{2,6})$/);
  return match?.[1]?.toLowerCase() ?? "";
}

function isRemoteAssetUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function preferredRemoteImageUrl(
  imageUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined,
) {
  if (isRemoteAssetUrl(imageUrl)) return imageUrl;
  if (isRemoteAssetUrl(thumbnailUrl)) return thumbnailUrl;
  return null;
}

function collectAssets(
  artifacts: ProjectExportArtifacts,
  uploadedAssets: ProjectUploadedAsset[],
  selected: ReadonlySet<ProjectExportSection>,
) {
  const assets: ProjectExportAsset[] = [];
  const assetPathByUrl = new Map<string, string>();
  const usedUrls = new Set<string>();
  const usedPaths = new Set<string>();

  function add(
    folder: string,
    name: string,
    url: string,
    fallbackExtension = "",
  ) {
    if (!isRemoteAssetUrl(url) || usedUrls.has(url)) return;
    const nameExtension = extensionFrom(name);
    const extension = nameExtension || extensionFrom(url) || fallbackExtension;
    const nameWithoutExtension = nameExtension
      ? name.slice(0, -nameExtension.length)
      : name;
    const basePath = `assets/${folder}/${safeStem(nameWithoutExtension)}`;
    let relativePath = `${basePath}${extension}`;
    for (let suffix = 2; usedPaths.has(relativePath); suffix += 1) {
      relativePath = `${basePath}-${suffix}${extension}`;
    }
    usedUrls.add(url);
    usedPaths.add(relativePath);
    assetPathByUrl.set(url, relativePath);
    assets.push({ relativePath, url });
  }

  if (selected.has("research") && artifacts.research) {
    for (const competitor of artifacts.research.competitiveAnalysis
      .competitors) {
      if (isRemoteAssetUrl(competitor.logoUrl)) {
        add("research", `${competitor.name}-logo`, competitor.logoUrl);
      }
    }
    for (const group of artifacts.research.uiPatterns) {
      for (const example of group.examples) {
        const url = preferredRemoteImageUrl(
          example.imageUrl,
          example.thumbnailUrl,
        );
        if (isRemoteAssetUrl(url)) {
          add("research", example.title, url);
        }
      }
    }
  }

  if (selected.has("moodboard") && artifacts.moodboard) {
    for (const reference of artifacts.moodboard.references) {
      const url = reference.imageUrl || reference.thumbnailUrl;
      if (isRemoteAssetUrl(url)) {
        add("moodboard", reference.title ?? reference.id, url);
      }
    }
  }

  if (selected.has("assets")) {
    for (const upload of uploadedAssets) {
      if (isRemoteAssetUrl(upload.url)) {
        const mimeExtension =
          upload.mimeType === "application/pdf"
            ? ".pdf"
            : upload.mimeType === "image/png"
              ? ".png"
              : upload.mimeType === "image/jpeg"
                ? ".jpg"
                : upload.mimeType === "image/webp"
                  ? ".webp"
                  : "";
        add("uploads", upload.title, upload.url, mimeExtension);
      }
    }
  }

  return { assets, assetPathByUrl };
}

// Placed right after "Read first" so agents adopt the selected library before they plan.
const COMPONENT_LIBRARIES_RULES = `## Component libraries (mandatory)

If \`skills.md\` lists component libraries, they are the UI kit for this project. This is a requirement, not a suggestion. They are public references: do not use Stage credentials or private storage. If several libraries are listed, the first one is the primary kit: use the others only for components it does not have.

1. **Read the library docs before planning.** Open each library's documentation. If it offers machine-readable docs (llms.txt, a registry index, an MCP server, or an agent skill / SKILL.md), use and install those first.
2. **Use the library's stack and install method.** Use the framework, install command and styling system the library documents (for example a shadcn registry, an npm package, CSS modules or Tailwind). Do not port the library to another framework or styling system unless the brief requires it.
3. **Library first, every time.** For every UI element (buttons, inputs, selects, badges, cards, tables, menus, dialogs, toasts, charts, empty states, loaders), use the library component when one exists. Build custom code only for page layout and for needs the library does not cover.
4. **Use the signature components for the key moments.** Where the library offers richer interactive components that match a flow in \`flows.md\`, use them for those moments instead of plain buttons and cards.
5. **Map the style guide onto the library's tokens.** Apply the style guide's colors, type and spacing through the library's theme tokens. Do not add a second styling system for them.
6. **No second kit.** Do not mix in another component library or framework default components unless \`skills.md\` lists them.
7. **Respect licensing.** Use only free or public components unless the documents say a paid license is available.

### Required in your plan

Before writing code, include a component map: for each screen, list the library components you will use and any custom pieces, with the reason each custom piece is needed.

### Required before you finish

- Seed the demo data so every key component is visible in at least one state (for example, something waiting for review, a contract to sign, a second version to compare).
- Add \`COMPONENTS.md\` listing each library component used and where.
- Search the code for hand-built controls (raw \`<button>\`, \`<input>\`, custom card or badge styles) and replace any that have a library equivalent.`;

function agentsMarkdown(
  exportedPaths: string[],
  hasComponentLibraries: boolean,
  typeLabel: string,
) {
  const componentLibrariesSection = hasComponentLibraries ? `\n\n${COMPONENT_LIBRARIES_RULES}` : "";
  return `# AGENTS.md

This folder is a Stage export: thinking and specification for this project. It is not a copy of the Stage application and is not a Git repository unless you initialize one. Treat the exported project material as the source of truth.

**Project category:** ${typeLabel}

## Read first

${["AGENTS.md", ...exportedPaths.filter((path) => path !== "AGENTS.md")].map((path, index) => `${index + 1}. \`${path}\``).join("\n")}${componentLibrariesSection}

## How to use this brief

- Research and strategy define the product and business intent. Do not contradict them.
- Moodboard and style guide define the visual direction. Carry the moodboard through. Do not fall back to a generic palette, default typography, or a default grid.
- Flows and wireframes define screen structure and behavior.
- Reuse the supplied assets where relevant.
- Do not invent missing requirements. State assumptions or ask for clarification.

## Working instructions

- Read every exported document and relevant file in \`assets/\` before planning.
- Start by summarizing your understanding and proposing an implementation plan before changing files.
- Keep implementation code clear, maintainable, accessible, and production-ready.
`;
}

function skillsMarkdown(
  skillIds: readonly string[],
  componentPackIds: readonly string[],
  importedItems: readonly {
    id: string;
    kind: "skill" | "component";
    name: string;
    sourceUrl: string;
  }[] = [],
) {
  const importedSkills = importedItems.filter((item) => item.kind === "skill");
  const importedPacks = importedItems.filter((item) => item.kind === "component");
  const skills = [
    ...importedSkills.map((item) => ({
      id: item.id,
      name: item.name,
      sourceUrl: item.sourceUrl,
      description: item.sourceUrl,
    })),
    ...DISCOVER_SKILL_CATALOG.filter((skill) => skillIds.includes(skill.id)),
  ].filter(
    (skill, index, list) =>
      skillIds.includes(skill.id) &&
      list.findIndex((entry) => entry.id === skill.id) === index,
  );
  const packs = [
    ...importedPacks.map((item) => ({
      id: item.id,
      name: item.name,
      sourceUrl: item.sourceUrl,
      description: item.sourceUrl,
    })),
    ...COMPONENT_PACK_CATALOG.filter((pack) => componentPackIds.includes(pack.id)),
  ].filter(
    (pack, index, list) =>
      componentPackIds.includes(pack.id) &&
      list.findIndex((entry) => entry.id === pack.id) === index,
  );
  if (skills.length === 0 && packs.length === 0) {
    return null;
  }

  const lines = [
    "# Skills and component libraries",
    "",
    packs.length > 0
      ? "Public references selected for this Stage export. The component libraries are the UI kit: do not hand-roll replacements. Before planning, open each library's docs and use its machine-readable docs (llms.txt, registry, MCP server or agent skill) and documented install command. Do not expect Stage R2 credentials or private file URLs."
      : "Public references selected for this Stage export. Apply these skills while implementing. Do not expect Stage R2 credentials or private file URLs.",
  ];

  if (skills.length > 0) {
    lines.push("", "## Skills", "");
    for (const skill of skills) {
      lines.push(`- [${skill.name}](${skill.sourceUrl}) — ${skill.description}`);
    }
  }

  if (packs.length > 0) {
    lines.push("", "## Component libraries", "");
    for (const pack of packs) {
      const label = pack.sourceUrl ? `[${pack.name}](${pack.sourceUrl})` : pack.name;
      lines.push(`- ${label} — ${pack.description}`);
    }
  }

  lines.push("");
  return { markdown: lines.join("\n"), hasComponentLibraries: packs.length > 0 };
}

export function buildProjectExport(input: BuildProjectExportInput) {
  const files: ProjectExportFile[] = [
    {
      relativePath: "project.md",
      content: `# ${input.project.name}\n\n| Project detail | Value |\n|---|---|\n| Client | ${input.project.clientName || "Not specified"} |\n| Project type | ${input.project.typeLabel} |\n| Exported from | Stage |\n`,
    },
  ];
  const { artifacts, selected } = input;
  const collectedAssets = collectAssets(
    artifacts,
    input.uploadedAssets,
    selected,
  );

  if (selected.has("research") && artifacts.research) {
    files.push({
      relativePath: "research.md",
      content: researchMarkdown(
        artifacts.research,
        collectedAssets.assetPathByUrl,
      ),
    });
  }
  if (selected.has("strategy") && artifacts.strategy) {
    files.push({
      relativePath: "strategy.md",
      content: strategyMarkdown(artifacts.strategy),
    });
  }
  if (selected.has("moodboard") && artifacts.moodboard) {
    files.push({
      relativePath: "moodboard.md",
      content: moodboardMarkdown(
        artifacts.moodboard,
        collectedAssets.assetPathByUrl,
      ),
    });
  }
  if (selected.has("styleGuide") && artifacts.moodboard?.styleGuides.length) {
    files.push({
      relativePath: "style-guide.md",
      content: styleGuideMarkdown(artifacts.moodboard, input.project.typeLabel),
    });
  }
  if (selected.has("flows") && artifacts.flows) {
    files.push({
      relativePath: "flows.md",
      content: flowsMarkdown(artifacts.flows),
    });
  }
  if (
    selected.has("wireframes") &&
    artifacts.wireframes &&
    hasExportableWireframes(artifacts.wireframes)
  ) {
    files.push({
      relativePath: "wireframes.md",
      content: wireframesMarkdown(artifacts.wireframes),
    });
  }
  if (selected.has("assets")) {
    files.push({
      relativePath: "assets.md",
      content: assetsMarkdown(
        artifacts.assets,
        input.uploadedAssets,
        collectedAssets.assetPathByUrl,
      ),
    });
  }

  const exportedPaths = files.map(({ relativePath }) => relativePath);
  const catalogMarkdown = skillsMarkdown(
    input.skillIds ?? [],
    input.componentPackIds ?? [],
    input.importedItems ?? [],
  );
  if (catalogMarkdown) {
    files.push({
      relativePath: "skills.md",
      content: catalogMarkdown.markdown,
    });
  }
  const readFirst = catalogMarkdown
    ? ["project.md", "skills.md", ...exportedPaths.slice(1)].filter(
        (path): path is string => Boolean(path),
      )
    : exportedPaths;
  files.unshift({
    relativePath: "AGENTS.md",
    content: agentsMarkdown(
      readFirst,
      catalogMarkdown?.hasComponentLibraries ?? false,
      input.project.typeLabel,
    ),
  });
  return {
    files,
    assets: collectedAssets.assets,
  };
}
