import type { ResearchArtifact } from "../../../../src/contracts/research";

const NOTION_VERSION = "2026-03-11";
const RICH_TEXT_CHUNK_SIZE = 2000;
const MAX_CHILDREN_PER_REQUEST = 100;

type NotionRichText = { type: "text"; text: { content: string } };

type NotionBlock = {
  object: "block";
  type: "heading_2" | "paragraph" | "image";
  heading_2?: { rich_text: NotionRichText[] };
  paragraph?: { rich_text: NotionRichText[] };
  image?: {
    type: "external";
    external: { url: string };
  };
};

function isEmbeddableImageUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function imageBlock(url: string): NotionBlock | null {
  if (!isEmbeddableImageUrl(url)) {
    return null;
  }

  return {
    object: "block",
    type: "image",
    image: {
      type: "external",
      external: { url },
    },
  };
}

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

function sectionBlocks(heading: string, body: string): NotionBlock[] {
  return [headingBlock(heading), ...paragraphBlocks(body)];
}

function formatNotionPageId(raw: string) {
  const withoutDashes = raw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(withoutDashes)) {
    throw new Error("Invalid Notion page ID.");
  }

  return `${withoutDashes.slice(0, 8)}-${withoutDashes.slice(8, 12)}-${withoutDashes.slice(12, 16)}-${withoutDashes.slice(16, 20)}-${withoutDashes.slice(20)}`;
}

export function parseNotionPageIdFromInput(input: string) {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/([0-9a-f]{32})(?:[?#]|$)/i);
  if (fromUrl?.[1]) {
    return formatNotionPageId(fromUrl[1]);
  }

  const fromUuid = trimmed.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  if (fromUuid?.[1]) {
    return fromUuid[1].toLowerCase();
  }

  const compact = trimmed.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(compact)) {
    return formatNotionPageId(compact);
  }

  throw new Error("Paste a valid Notion page URL or page ID.");
}

export function buildNotionBlocksFromResearchArtifact(artifact: ResearchArtifact) {
  const blocks: NotionBlock[] = [];

  if (artifact.summary.length > 0) {
    blocks.push(headingBlock("Summary"));
    for (const item of artifact.summary) {
      blocks.push(...paragraphBlocks(`• ${item}`));
    }
  }

  if (artifact.companySnapshot.length > 0) {
    blocks.push(headingBlock("Company Snapshot"));
    const snapshotText = artifact.companySnapshot.map((row) => `${row.label}: ${row.value}`).join("\n");
    blocks.push(...paragraphBlocks(snapshotText));
  }

  if (artifact.competitiveAnalysis.competitors.length > 0) {
    blocks.push(headingBlock("Competitive Analysis"));
    for (const competitor of artifact.competitiveAnalysis.competitors) {
      const lines = [
        competitor.name,
        competitor.url ? `URL: ${competitor.url}` : null,
        competitor.positioning ? `Positioning: ${competitor.positioning}` : null,
        competitor.summary ? `Summary: ${competitor.summary}` : null,
        competitor.strengths.length > 0 ? `Strengths: ${competitor.strengths.join("; ")}` : null,
        competitor.weaknesses.length > 0 ? `Weaknesses: ${competitor.weaknesses.join("; ")}` : null,
      ].filter((line): line is string => Boolean(line));
      blocks.push(...paragraphBlocks(lines.join("\n")));
    }
  }

  if (artifact.uiPatterns.length > 0) {
    blocks.push(headingBlock("UI Patterns"));
    for (const group of artifact.uiPatterns) {
      const patterns =
        group.recognizedPatterns.length > 0
          ? group.recognizedPatterns.join(", ")
          : "No recognized patterns";
      blocks.push(headingBlock(group.title));
      blocks.push(...paragraphBlocks(patterns));
      for (const example of group.examples) {
        const imageUrl = example.imageUrl ?? example.thumbnailUrl;
        if (!imageUrl) {
          continue;
        }
        const block = imageBlock(imageUrl);
        if (block) {
          blocks.push(block);
        }
      }
    }
  }

  if (artifact.targetUsers.length > 0) {
    blocks.push(headingBlock("Target Users"));
    for (const user of artifact.targetUsers) {
      const lines = [
        `${user.name} (${user.role})`,
        user.goals.length > 0 ? `Goals: ${user.goals.join("; ")}` : null,
        user.frustrations.length > 0 ? `Frustrations: ${user.frustrations.join("; ")}` : null,
        user.context ? `Context: ${user.context}` : null,
      ].filter((line): line is string => Boolean(line));
      blocks.push(...paragraphBlocks(lines.join("\n")));
    }
  }

  if (artifact.opportunities.length > 0) {
    blocks.push(headingBlock("Opportunities"));
    for (const opportunity of artifact.opportunities) {
      const label = opportunity.title
        ? `${opportunity.title}: ${opportunity.description}`
        : opportunity.description;
      blocks.push(...paragraphBlocks(label));
    }
  }

  if (artifact.customSections.length > 0) {
    blocks.push(headingBlock("Additional Sections"));
    for (const section of artifact.customSections) {
      blocks.push(...sectionBlocks(section.title, section.body));
    }
  }

  if (blocks.length === 0) {
    blocks.push(...paragraphBlocks("Research artifact exported from Stage."));
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
  const [initialChildren, ...remainingChildChunks] = chunkNotionBlocks(
    args.children,
    MAX_CHILDREN_PER_REQUEST,
  );
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
