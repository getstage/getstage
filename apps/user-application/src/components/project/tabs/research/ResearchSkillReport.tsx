import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResearchSkillReport as SkillReport } from "@stage/data-ops/contracts";

// Reports saved before v0.2.63 can contain a pasted copy of Stage's artifact JSON.
export function cleanSkillMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !(line.trim().startsWith("{") && line.includes('"artifactKind"')))
    .join("\n")
    .trim();
}

// Summary bullets from the report's "## Summary" section, else its first bullets.
export function skillReportSummary(markdown: string): string[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^#{1,3}\s+summary\b/i.test(line.trim()));
  const scope = start >= 0 ? lines.slice(start + 1) : lines;
  const end = start >= 0 ? scope.findIndex((line) => /^#{1,6}\s/.test(line.trim())) : -1;
  return (end >= 0 ? scope.slice(0, end) : scope)
    .map((line) => line.trim().match(/^[-*+]\s+(.*)$/)?.[1])
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/\*\*(.+?)\*\*/g, "$1"))
    .slice(0, 6);
}

const markdownStyles =
  "flex flex-col gap-3 text-[13px] leading-[1.5] font-medium text-neutral-700 [&_a]:text-[#2b7fff] [&_a]:underline [&_h1]:text-[16px] [&_h1]:text-neutral-900 [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_h3]:font-semibold [&_h3]:text-neutral-900 [&_li]:ms-[19.5px] [&_ol]:list-decimal [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-200 [&_td]:p-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-100 [&_th]:p-2 [&_th]:text-left [&_ul]:list-disc [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1";

// Research.md: the result of the user's uploaded SKILLs, shown above Stage's own research
// (Figma 2346:9096). Read More expands the full Markdown document.
export function ResearchSkillReport({ report }: { report: SkillReport }) {
  const [expanded, setExpanded] = useState(false);
  const markdown = report.markdown ? cleanSkillMarkdown(report.markdown) : "";
  const summary = markdown ? skillReportSummary(markdown) : [];
  const names = report.skills.map((skill) => skill.name).join(", ");

  return (
    <section className="mb-1 flex flex-col gap-4 overflow-hidden rounded-[8px] border-[0.5px] border-neutral-300 bg-neutral-50 p-4 shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.4)]">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-[16px] font-medium text-neutral-900">Research.md</h2>
        <p className="text-[12px] text-neutral-500" title={names}>
          Generated with uploaded SKILLS
        </p>
      </header>

      {report.error ? (
        <p role="alert" className="text-[13px] leading-[1.5] font-medium text-red-600">
          The skill could not finish: {report.error} Stage's own research below is complete.
        </p>
      ) : expanded && markdown ? (
        <div className={markdownStyles}>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}
          >
            {markdown}
          </Markdown>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-neutral-900">Summary</h3>
          {summary.length > 0 ? (
            <ul className="list-disc text-[13px] leading-[1.5] font-medium text-neutral-700">
              {summary.map((item) => (
                <li key={item} className="ms-[19.5px]">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-[1.5] font-medium text-neutral-700">Open the full document to read the skill's result.</p>
          )}
        </div>
      )}

      {markdown && !report.error ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="w-fit text-[12px] leading-[1.5] font-medium text-[#2b7fff] underline"
        >
          {expanded ? "Show less" : "Read More"}
        </button>
      ) : null}
    </section>
  );
}
