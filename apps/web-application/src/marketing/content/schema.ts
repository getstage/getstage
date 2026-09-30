import { z } from "zod";

// Shape of content.json: every marketing page, use case, blog post and redirect.
// Parsed at build time (pre-render) and in the SPA, so a bad edit fails the
// deploy instead of shipping a broken page.

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

// Internal paths ("/download", "/blog/x#chapters") or absolute https links.
const href = z.string().regex(/^(\/|https:\/\/)/, "Links start with / or https://");

const seoSchema = z.object({
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(50).max(160),
  shareImage: z.string().optional(),
  noIndex: z.boolean(),
});

// --- Rich text -----------------------------------------------------------------

const textNode = z.object({
  type: z.literal("text"),
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  code: z.boolean().optional(),
});

const linkNode = z.object({
  type: z.literal("link"),
  url: href,
  children: z.array(textNode),
});

const inlineNode = z.discriminatedUnion("type", [textNode, linkNode]);

const listItemNode = z.object({
  type: z.literal("list-item"),
  children: z.array(inlineNode),
});

type ListNode = {
  type: "list";
  format: "ordered" | "unordered";
  children: Array<z.infer<typeof listItemNode> | ListNode>;
};

const listNode: z.ZodType<ListNode> = z.object({
  type: z.literal("list"),
  format: z.enum(["ordered", "unordered"]),
  get children() {
    return z.array(z.union([listItemNode, listNode]));
  },
});

const richTextSchema = z.array(
  z.union([
    z.object({ type: z.literal("paragraph"), children: z.array(inlineNode) }),
    z.object({
      type: z.literal("heading"),
      // The page title is the only H1; text sections start at H2.
      level: z.number().int().min(2, "Heading 1 is reserved for the page title").max(6),
      children: z.array(inlineNode),
    }),
    listNode,
    z.object({ type: z.literal("quote"), children: z.array(inlineNode) }),
    z.object({ type: z.literal("code"), children: z.array(textNode) }),
    z.object({
      type: z.literal("image"),
      image: z.object({
        url: z.string(),
        alt: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
    }),
  ]),
);

// --- Page blocks --------------------------------------------------------------

const imageSchema = z.object({
  url: z.string(),
  alt: z.string().min(1, "Describe the image for screen readers and Google"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const blockSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("hero"),
      eyebrow: z.string().optional(),
      heading: z.string().min(1),
      lede: z.string().optional(),
      buttonLabel: z.string().optional(),
      buttonHref: href.optional(),
    })
    .refine((hero) => (hero.buttonLabel === undefined) === (hero.buttonHref === undefined), {
      message: "A hero button needs both a label and a link",
    }),
  z.object({ type: z.literal("richText"), heading: z.string().optional(), body: richTextSchema }),
  z.object({
    type: z.literal("steps"),
    heading: z.string().min(1),
    items: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
  }),
  z.object({
    type: z.literal("checklist"),
    heading: z.string().min(1),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("faq"),
    heading: z.string().min(1),
    items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
  }),
  z.object({
    type: z.literal("cardGrid"),
    heading: z.string().optional(),
    items: z
      .array(z.object({ title: z.string().min(1), body: z.string().min(1), href }))
      .min(1),
  }),
  z.object({
    type: z.literal("useCaseLinks"),
    heading: z.string().min(1),
    group: z.enum(["all", "audience", "workflow"]),
  }),
  z.object({
    type: z.literal("blogList"),
    heading: z.string().min(1),
    limit: z.number().int().min(1).max(12),
  }),
  z.object({
    type: z.literal("video"),
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().min(1),
    thumbnail: z.string(),
  }),
  z.object({ type: z.literal("image"), image: imageSchema, caption: z.string().optional() }),
  z.object({
    type: z.literal("cta"),
    heading: z.string().min(1),
    body: z.string().optional(),
    buttonLabel: z.string().min(1),
    buttonHref: href,
  }),
]);

// --- Entries -----------------------------------------------------------------

const pageSchema = z
  .object({
    slug,
    title: z.string().min(1),
    seo: seoSchema,
    blocks: z.array(blockSchema).min(1),
  })
  .refine((page) => page.blocks[0]?.type === "hero", {
    message: "A page starts with a Hero block (it holds the page title)",
  })
  .refine((page) => page.blocks.filter((block) => block.type === "hero").length === 1, {
    message: "A page has exactly one Hero block",
  });

const useCaseSchema = z.object({
  slug,
  group: z.enum(["audience", "workflow"]),
  label: z.string().min(1),
  summary: z.string().min(1),
  seo: seoSchema,
  title: z.string().min(1),
  intro: z.string().min(1),
  problem: z.object({ heading: z.string().min(1), body: z.string().min(1) }),
  steps: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
  outcomes: z.array(z.string().min(1)).min(1),
  faq: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
});

const videoLength = z.string().regex(/^\d{1,2}(:\d{2}){1,2}$/, "Use m:ss or h:mm:ss");

const blogPostSchema = z.object({
  slug,
  category: z.enum(["case-study", "tools", "tutorial", "news"]),
  title: z.string().min(1),
  date: z.iso.date(),
  author: z.string().min(1),
  summary: z.string().min(1),
  seo: seoSchema,
  video: z.object({
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    thumbnail: z.string(),
    length: videoLength.optional(),
  }),
  chapters: z.array(z.object({ time: videoLength, label: z.string().min(1) })),
  body: richTextSchema.min(1),
  relatedUseCases: z.array(slug),
});

const redirectSchema = z.object({
  from: z.string().regex(/^\/[A-Za-z0-9/_.~-]*$/),
  to: href,
});

export const contentSchema = z.object({
  pages: z.array(pageSchema),
  useCases: z.array(useCaseSchema),
  blogPosts: z.array(blogPostSchema),
  redirects: z.array(redirectSchema),
});

export type Content = z.infer<typeof contentSchema>;
export type Seo = z.infer<typeof seoSchema>;
export type Page = z.infer<typeof pageSchema>;
export type PageBlock = z.infer<typeof blockSchema>;
export type RichText = z.infer<typeof richTextSchema>;
export type RichTextNode = RichText[number];
export type InlineNode = z.infer<typeof inlineNode>;
export type ListItemNode = z.infer<typeof listItemNode>;
export type { ListNode };
export type UseCase = z.infer<typeof useCaseSchema>;
export type UseCaseGroup = UseCase["group"];
export type BlogPost = z.infer<typeof blogPostSchema>;
export type BlogCategory = BlogPost["category"];
export type Redirect = z.infer<typeof redirectSchema>;
