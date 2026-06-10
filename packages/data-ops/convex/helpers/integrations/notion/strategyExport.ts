import { strategyArtifactSchema, type StrategyArtifact } from "../../../../src/contracts/strategy";

const NOTION_VERSION = "2026-03-11";
const RICH_TEXT_CHUNK_SIZE = 2000;
const MAX_CHILDREN_PER_REQUEST = 100;

type NotionRichText = { type: "text"; text: { content: string } };

type NotionBlock = {
  object: "block";
  type: "heading_2" | "paragraph";
  heading_2?: { rich_text: NotionRichText[] };
  paragraph?: { rich_text: NotionRichText[] };
};

function richText(content: string): NotionRichText[] {
  return [{ type: "text", text: { content } }];
}

function headingBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: richText(text.slice(0, RICH_TEXT_CHUNK_SIZE)) },
  };
}

function paragraphBlocks(text: string): NotionBlock[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const blocks: NotionBlock[] = [];
  for (let index = 0; index < trimmed.length; index += RICH_TEXT_CHUNK_SIZE) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText(trimmed.slice(index, index + RICH_TEXT_CHUNK_SIZE)) },
    });
  }
  return blocks;
}

function sectionBlocks(heading: string, body: string) {
  return [headingBlock(heading), ...paragraphBlocks(body)];
}

export function parseStrategyArtifactContent(contentJson: string) {
  try {
    return strategyArtifactSchema.parse(JSON.parse(contentJson) as unknown);
  } catch {
    return null;
  }
}

export function buildNotionBlocksFromStrategyArtifact(artifact: StrategyArtifact) {
  const blocks: NotionBlock[] = [];

  for (const section of artifact.sections) {
    if (section.kind === "principles" && section.principles) {
      blocks.push(
        ...sectionBlocks(
          section.title,
          section.principles
            .map((principle, index) =>
              [
                `${index + 1}. ${principle.title}`,
                principle.body,
                principle.research ? `Research: ${principle.research}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            )
            .join("\n\n"),
        ),
      );
      continue;
    }

    if (section.kind === "table" && section.table) {
      blocks.push(
        ...sectionBlocks(
          section.title,
          section.table.map(([label, value]) => `${label}: ${value}`).join("\n"),
        ),
      );
      continue;
    }

    if (section.kind === "cards" && section.cards) {
      blocks.push(
        ...sectionBlocks(
          section.title,
          section.cards
            .map((card) =>
              [
                card.title,
                `Objective: ${card.objective}`,
                `KPI: ${card.kpi}`,
                `Key element: ${card.keyElement}`,
              ].join("\n"),
            )
            .join("\n\n"),
        ),
      );
      continue;
    }

    if (section.kind === "boxes" && section.boxes) {
      blocks.push(
        ...sectionBlocks(
          section.title,
          section.boxes
            .map((box) => `${box.title}\n${box.bullets.map((bullet) => `• ${bullet}`).join("\n")}`)
            .join("\n\n"),
        ),
      );
      continue;
    }

    blocks.push(...sectionBlocks(section.title, (section.body ?? []).join("\n")));
  }

  if (blocks.length === 0) {
    blocks.push(...paragraphBlocks("Strategy artifact exported from Stage."));
  }

  return blocks.slice(0, MAX_CHILDREN_PER_REQUEST);
}

async function notionFetch(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Notion API failed: ${response.status} ${errorBody}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function createNotionChildPage(args: {
  accessToken: string;
  parentPageId: string;
  title: string;
  children: NotionBlock[];
}) {
  const page = (await notionFetch(args.accessToken, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: args.parentPageId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: args.title.slice(0, RICH_TEXT_CHUNK_SIZE) } }],
        },
      },
      children: args.children,
    }),
  })) as { id?: string; url?: string };

  const pageId = typeof page.id === "string" ? page.id : null;
  const destinationUrl =
    typeof page.url === "string"
      ? page.url
      : pageId
        ? `https://www.notion.so/${pageId.replace(/-/g, "")}`
        : null;

  if (!destinationUrl) {
    throw new Error("Notion did not return a page URL.");
  }

  return { pageId, destinationUrl };
}
