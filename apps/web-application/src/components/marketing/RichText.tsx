import { Fragment, type ReactNode } from "react";
import type { InlineNode, ListNode, RichText as RichTextNodes } from "@/marketing/content";
import { linkProps } from "./links";

// Renders rich-text JSON (paragraphs, headings, lists, links, …) as plain semantic
// HTML. No HTML strings are injected, so the output is safe and pre-renders as-is.
export function RichText({ nodes }: { nodes: RichTextNodes }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "paragraph":
            return <p key={index}>{inline(node.children)}</p>;
          case "heading": {
            const Heading = `h${node.level}` as "h2" | "h3" | "h4" | "h5" | "h6";
            return <Heading key={index}>{inline(node.children)}</Heading>;
          }
          case "list":
            return <List key={index} node={node} />;
          case "quote":
            return <blockquote key={index}>{inline(node.children)}</blockquote>;
          case "code":
            return (
              <pre key={index}>
                <code>{node.children.map((child) => child.text).join("")}</code>
              </pre>
            );
          case "image":
            return (
              <img
                key={index}
                src={node.image.url}
                alt={node.image.alt}
                width={node.image.width}
                height={node.image.height}
                loading="lazy"
                decoding="async"
              />
            );
        }
      })}
    </>
  );
}

function List({ node }: { node: ListNode }) {
  const Tag = node.format === "ordered" ? "ol" : "ul";
  return (
    <Tag>
      {node.children.map((child, index) =>
        child.type === "list" ? (
          <li key={index}>
            <List node={child} />
          </li>
        ) : (
          <li key={index}>{inline(child.children)}</li>
        ),
      )}
    </Tag>
  );
}

function inline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "link") {
      return (
        <a key={index} {...linkProps(node.url)}>
          {inline(node.children)}
        </a>
      );
    }

    let text: ReactNode = node.text;
    if (node.code) text = <code>{text}</code>;
    if (node.bold) text = <strong>{text}</strong>;
    if (node.italic) text = <em>{text}</em>;
    if (node.underline) text = <u>{text}</u>;
    if (node.strikethrough) text = <s>{text}</s>;
    return <Fragment key={index}>{text}</Fragment>;
  });
}
