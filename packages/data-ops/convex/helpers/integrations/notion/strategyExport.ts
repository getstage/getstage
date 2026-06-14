import { strategyArtifactSchema, type StrategyArtifact } from "../../../../src/contracts/strategy";

const NOTION_VERSION = "2026-03-11";
const RICH_TEXT_CHUNK_SIZE = 2000;
const MAX_CHILDREN_PER_REQUEST = 100;

type NotionRichText = { type: "text"; text: { content: string } };

type NotionTableRowBlock = {
  object: "block";
  type: "table_row";
  table_row: {
    cells: NotionRichText[][];
  };
};

type NotionTableBlock = {
  object: "block";
  type: "table";
  table: {
    table_width: number;
    has_column_header: boolean;
    has_row_header: boolean;
    children: NotionTableRowBlock[];
  };
};

type NotionBlock =
  | {
      object: "block";
      type: "heading_2" | "paragraph";
      heading_2?: { rich_text: NotionRichText[] };
      paragraph?: { rich_text: NotionRichText[] };
    }
  | NotionTableBlock;

function richText(content: string): NotionRichText[] {
  return [{ type: "text", text: { content: content.slice(0, RICH_TEXT_CHUNK_SIZE) } }];
}

function headingBlock(text: string): NotionBlock {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: richText(text) },
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

function tableRowBlock(cells: string[]): NotionTableRowBlock {
  return {
    object: "block",
    type: "table_row",
    table_row: {
      cells: cells.map((cell) => richText(cell)),
    },
  };
}

function notionTableBlock(args: {
  width: number;
  rows: string[][];
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
}): NotionTableBlock {
  const children = args.rows.map((row) => tableRowBlock(row));
  if (children.length === 0) {
    children.push(tableRowBlock(Array.from({ length: args.width }, () => "")));
  }

  return {
    object: "block",
    type: "table",
    table: {
      table_width: args.width,
      has_column_header: args.hasColumnHeader ?? false,
      has_row_header: args.hasRowHeader ?? false,
      children,
    },
  };
}

function labelValueTableBlock(rows: Array<[string, string]>): NotionTableBlock {
  return notionTableBlock({
    width: 2,
    rows: rows.map(([label, value]) => [label, value]),
    hasRowHeader: true,
  });
}

function cardsTableBlock(
  cards: Array<{
    title: string;
    objective: string;
    kpi: string;
    keyElement: string;
  }>,
): NotionTableBlock {
  return notionTableBlock({
    width: 4,
    rows: [
      ["Page", "Objective", "KPI", "Key element"],
      ...cards.map((card) => [card.title, card.objective, card.kpi, card.keyElement]),
    ],
    hasColumnHeader: true,
  });
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

    if (section.kind === "table" && section.table?.length) {
      blocks.push(headingBlock(section.title));
      blocks.push(labelValueTableBlock(section.table));
      continue;
    }

    if (section.kind === "cards" && section.cards?.length) {
      blocks.push(headingBlock(section.title));
      blocks.push(cardsTableBlock(section.cards));
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

  return blocks;
}

function chunkNotionBlocks(blocks: NotionBlock[], chunkSize: number) {
  const chunks: NotionBlock[][] = [];
  for (let index = 0; index < blocks.length; index += chunkSize) {
    chunks.push(blocks.slice(index, index + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
}

async function appendNotionChildBlocks(
  accessToken: string,
  parentBlockId: string,
  children: NotionBlock[],
) {
  await notionFetch(accessToken, `/blocks/${parentBlockId}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });
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
  const childChunks = chunkNotionBlocks(args.children, MAX_CHILDREN_PER_REQUEST);
  const initialChildren = childChunks[0] ?? [];
  const remainingChildChunks = childChunks.slice(1);
  const page = (await notionFetch(args.accessToken, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: args.parentPageId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: args.title.slice(0, RICH_TEXT_CHUNK_SIZE) } }],
        },
      },
      children: initialChildren,
    }),
  })) as { id?: string; url?: string };

  const pageId = typeof page.id === "string" ? page.id : null;
  if (pageId) {
    for (const chunk of remainingChildChunks) {
      await appendNotionChildBlocks(args.accessToken, pageId, chunk);
    }
  }

  const destinationUrl =
    typeof page.url === "string"
      ? page.url
      : pageId
        ? `https://www.notion.so/${pageId.replace(/-/g, "")}`
        : null;

  if (!destinationUrl) {
    throw new Error("Notion did not return a page URL.");
  }

  const exportedBlockCount = args.children.length;
  const truncatedBlockCount =
    exportedBlockCount > MAX_CHILDREN_PER_REQUEST && !pageId
      ? exportedBlockCount - initialChildren.length
      : 0;

  return {
    pageId,
    destinationUrl,
    exportedBlockCount,
    truncatedBlockCount,
    contentTruncated: truncatedBlockCount > 0,
  };
}
