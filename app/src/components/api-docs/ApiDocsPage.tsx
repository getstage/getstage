import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CaretRight,
  CheckCircle,
  Copy,
  Globe,
  Moon,
  PlayCircle,
  RocketLaunch,
  ShieldCheck,
  Sun,
  WarningCircle,
} from "@phosphor-icons/react";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { cn } from "@/lib/utils";
import {
  API_REFERENCE_BASE_URL,
  stageApiEndpoints,
  stageApiSections,
  quickstartPrompt,
  type ApiCodeLanguage,
  type ApiEndpointDoc,
  type ApiFieldDoc,
  type ApiMethod,
} from "@/lib/stage-api-docs";

/* ─── types ─── */
type NavItem = {
  id: string;
  label: string;
  level: 1 | 2;
  method?: ApiMethod;
  icon?: "rocket" | "book";
};

/* ─── constants ─── */
const LANGUAGES: ApiCodeLanguage[] = ["curl", "typescript", "python"];

const languageLabels: Record<ApiCodeLanguage, string> = {
  curl: "cURL",
  typescript: "TypeScript",
  python: "Python",
};

const methodColors: Record<ApiMethod, { light: string; dark: string }> = {
  GET: {
    light: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dark: "dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  POST: {
    light: "bg-blue-100 text-blue-700 border-blue-200",
    dark: "dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800",
  },
  DELETE: {
    light: "bg-rose-100 text-rose-700 border-rose-200",
    dark: "dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800",
  },
  PATCH: {
    light: "bg-amber-100 text-amber-700 border-amber-200",
    dark: "dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800",
  },
};

function methodCn(method: ApiMethod) {
  return `${methodColors[method].light} ${methodColors[method].dark}`;
}

const endpointById = new Map(stageApiEndpoints.map((e) => [e.id, e]));

/* ─── snippet builders ─── */
function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function stringifyPythonLiteral(value: unknown, indent = 0): string {
  const space = " ".repeat(indent);
  if (value === null) return "None";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return `[\n${value
      .map((item) => `${" ".repeat(indent + 4)}${stringifyPythonLiteral(item, indent + 4)}`)
      .join(",\n")}\n${space}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return "{}";
    return `{\n${entries
      .map(
        ([key, item]) =>
          `${" ".repeat(indent + 4)}${JSON.stringify(key)}: ${stringifyPythonLiteral(item, indent + 4)}`
      )
      .join(",\n")}\n${space}}`;
  }
  return JSON.stringify(value);
}

function endpointUrl(endpoint: ApiEndpointDoc) {
  const pathPart = (
    endpoint.pathExample ||
    endpoint.path.replace(/:([A-Za-z]+)/g, (_m, name) => `{${name}}`)
  ).replace("/api/v1", "");
  return `${API_REFERENCE_BASE_URL}${pathPart}`;
}

function buildCurlSnippet(endpoint: ApiEndpointDoc) {
  const lines = [`curl -X ${endpoint.method} ${endpointUrl(endpoint)}`];
  lines.push(`  -H "Authorization: Bearer stg_your_api_key"`);
  lines.push(`  -H "Content-Type: application/json"`);
  if (endpoint.bodyExample) {
    lines.push(`  -d '${stringifyJson(endpoint.bodyExample)}'`);
  }
  return lines.join(" \\\n");
}

function buildTypeScriptSnippet(endpoint: ApiEndpointDoc) {
  const url = endpointUrl(endpoint);
  const options: string[] = [`method: "${endpoint.method}"`];
  options.push(
    `headers: {\n    "Authorization": "Bearer stg_your_api_key",\n    "Content-Type": "application/json",\n  }`
  );
  if (endpoint.bodyExample) {
    options.push(`body: JSON.stringify(${stringifyJson(endpoint.bodyExample)})`);
  }
  return `const response = await fetch("${url}", {\n  ${options.join(",\n  ")}\n});\n\nconst data = await response.json();\nconsole.log(data);`;
}

function buildPythonSnippet(endpoint: ApiEndpointDoc) {
  const url = endpointUrl(endpoint);
  const bodyLiteral = endpoint.bodyExample
    ? stringifyPythonLiteral(endpoint.bodyExample, 4)
    : null;
  return `import requests\n\nresponse = requests.${endpoint.method.toLowerCase()}(\n    "${url}",\n    headers={\n        "Authorization": "Bearer stg_your_api_key",\n        "Content-Type": "application/json",\n    },${bodyLiteral ? `\n    json=${bodyLiteral},` : ""}\n)\n\nprint(response.json())`;
}

/* ─── hooks ─── */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("stage-docs-dark");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("stage-docs-dark", String(dark));
  }, [dark]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return [dark, setDark] as const;
}

function useCopyClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) return;
    const t = window.setTimeout(() => setCopiedKey(null), 1800);
    return () => window.clearTimeout(t);
  }, [copiedKey]);

  const copy = useCallback((key: string, value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => setCopiedKey(key))
      .catch(() => setCopiedKey(null));
  }, []);

  return { copiedKey, copy };
}

/* ─── sub-components ─── */

function DarkModeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function SidebarNav({
  items,
  activeId,
  onSelect,
}: {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors",
            item.level === 2 && "pl-6",
            activeId === item.id
              ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          )}
        >
          {item.icon === "rocket" ? (
            <RocketLaunch className="h-3.5 w-3.5 shrink-0" />
          ) : item.icon === "book" ? (
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
          ) : null}
          {item.method ? (
            <span
              className={cn(
                "inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none",
                methodCn(item.method)
              )}
            >
              {item.method}
            </span>
          ) : null}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function TabbedCodeBlock({
  snippets,
  language,
  onLanguageChange,
  copiedKey,
  copyId,
  onCopy,
}: {
  snippets: Record<ApiCodeLanguage, string>;
  language: ApiCodeLanguage;
  onLanguageChange: (l: ApiCodeLanguage) => void;
  copiedKey: string | null;
  copyId: string;
  onCopy: (key: string, value: string) => void;
}) {
  const code = snippets[language];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-800 px-1 dark:border-slate-700">
        <div className="flex">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLanguageChange(l)}
              className={cn(
                "relative px-3.5 py-2.5 text-[13px] font-medium transition-colors",
                language === l
                  ? "text-violet-400"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {languageLabels[l]}
              {language === l ? (
                <span className="absolute inset-x-3.5 bottom-0 h-0.5 rounded-full bg-violet-400" />
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onCopy(copyId, code)}
          className="mr-3 flex items-center gap-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-300"
        >
          {copiedKey === copyId ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ResponseBlock({
  code,
  copiedKey,
  copyId,
  onCopy,
}: {
  code: string;
  copiedKey: string | null;
  copyId: string;
  onCopy: (key: string, value: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 dark:border-slate-700">
        <span className="text-[12px] font-medium text-slate-500">Response</span>
        <button
          type="button"
          onClick={() => onCopy(copyId, code)}
          className="flex items-center gap-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-300"
        >
          {copiedKey === copyId ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocFieldTable({ title, fields }: { title: string; fields?: ApiFieldDoc[] }) {
  if (!fields?.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h4>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Field
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr
                key={field.name}
                className="border-b border-slate-100 last:border-b-0 dark:border-slate-700/50"
              >
                <td className="px-4 py-3">
                  <code className="text-[13px] font-medium text-slate-900 dark:text-slate-200">
                    {field.name}
                  </code>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {field.required ? "Required" : "Optional"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {field.type}
                  </code>
                </td>
                <td className="px-4 py-3 text-[13px] text-slate-600 dark:text-slate-400">
                  {field.description}
                  {field.defaultValue ? (
                    <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Default: <code>{field.defaultValue}</code>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── endpoint view ─── */

function EndpointView({
  endpoint,
  language,
  onLanguageChange,
  copiedKey,
  onCopy,
  breadcrumb,
}: {
  endpoint: ApiEndpointDoc;
  language: ApiCodeLanguage;
  onLanguageChange: (l: ApiCodeLanguage) => void;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
  breadcrumb?: string;
}) {
  const snippets: Record<ApiCodeLanguage, string> = {
    curl: buildCurlSnippet(endpoint),
    typescript: buildTypeScriptSnippet(endpoint),
    python: buildPythonSnippet(endpoint),
  };
  const responseCode = stringifyJson(endpoint.responseExample);

  return (
    <div>
      {breadcrumb ? (
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{breadcrumb}</span>
          <CaretRight className="h-3 w-3" />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {endpoint.title}
          </span>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-bold",
            methodCn(endpoint.method)
          )}
        >
          {endpoint.method}
        </span>
        <code className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {endpoint.path}
        </code>
        <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
          Bearer auth
        </span>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        {endpoint.title}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
        {endpoint.summary}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {endpoint.description}
      </p>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_minmax(380px,1fr)]">
        <div className="space-y-5">
          <DocFieldTable title="Path parameters" fields={endpoint.pathFields} />
          <DocFieldTable title="Request body" fields={endpoint.bodyFields} />

          {endpoint.notes?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                <WarningCircle className="h-3.5 w-3.5" />
                Notes
              </div>
              <ul className="space-y-1 text-xs leading-5 text-amber-900 dark:text-amber-300">
                {endpoint.notes.map((note) => (
                  <li key={note}>&#8226; {note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <TabbedCodeBlock
            snippets={snippets}
            language={language}
            onLanguageChange={onLanguageChange}
            copiedKey={copiedKey}
            copyId={`${endpoint.id}:req`}
            onCopy={onCopy}
          />
          <ResponseBlock
            code={responseCode}
            copiedKey={copiedKey}
            copyId={`${endpoint.id}:res`}
            onCopy={onCopy}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── quickstart section ─── */

function QuickstartSection({
  language,
  onLanguageChange,
  copiedKey,
  onCopy,
}: {
  language: ApiCodeLanguage;
  onLanguageChange: (l: ApiCodeLanguage) => void;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  const endpoint = endpointById.get("import-plan")!;
  const snippets: Record<ApiCodeLanguage, string> = {
    curl: buildCurlSnippet(endpoint),
    typescript: buildTypeScriptSnippet(endpoint),
    python: buildPythonSnippet(endpoint),
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        Getting Started
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        The Stage API lets AI agents and external tools create and manage
        creative projects. It is a REST API authenticated with Bearer tokens.
      </p>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_minmax(380px,1fr)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Starter Flow
            </h3>
            <ol className="space-y-3">
              {[
                {
                  step: "1",
                  text: "Create an API key in Settings > Developer (Pro plan required)",
                },
                {
                  step: "2",
                  text: "Set your key: Authorization: Bearer stg_...",
                },
                {
                  step: "3",
                  text: "POST /api/v1/projects/import-plan with a structured project plan",
                },
                {
                  step: "4",
                  text: "GET /api/v1/projects to see your created projects",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                    {item.step}
                  </span>
                  <span className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {item.text}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/settings"
                search={{ tab: "developer" }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                Open settings
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/agents/skills"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                Agent skills
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="/agents/stitch"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                Stitch guide
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Globe className="h-3.5 w-3.5" />
              Base URL
            </div>
            <code className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {API_REFERENCE_BASE_URL}
            </code>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authentication
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Bearer token
                </span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  &mdash;{" "}
                  <code className="text-xs">Authorization: Bearer stg_...</code>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keys are owner-scoped. Max 5 active keys per user. Create and
                revoke in Settings &gt; Developer.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-800/30 dark:bg-violet-900/20">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              <PlayCircle className="h-3.5 w-3.5" />
              Example prompt
            </div>
            <p className="text-sm italic text-violet-700 dark:text-violet-300">
              &ldquo;{quickstartPrompt}&rdquo;
            </p>
          </div>
        </div>

        <div>
          <TabbedCodeBlock
            snippets={snippets}
            language={language}
            onLanguageChange={onLanguageChange}
            copiedKey={copiedKey}
            copyId="quickstart"
            onCopy={onCopy}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── section resolver ─── */

function resolveSection(id: string): {
  section: (typeof stageApiSections)[number] | null;
  scrollTo: string | null;
} {
  const section = stageApiSections.find((s) => s.id === id);
  if (section) return { section, scrollTo: null };

  const parent = stageApiSections.find((s) => s.endpointIds?.includes(id));
  if (parent) return { section: parent, scrollTo: id };

  return { section: null, scrollTo: null };
}

/* ─── section content ─── */

function SectionContent({
  sectionId,
  language,
  onLanguageChange,
  copiedKey,
  onCopy,
}: {
  sectionId: string;
  scrollToId?: string | null;
  language: ApiCodeLanguage;
  onLanguageChange: (l: ApiCodeLanguage) => void;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  if (sectionId === "getting-started") {
    return (
      <QuickstartSection
        language={language}
        onLanguageChange={onLanguageChange}
        copiedKey={copiedKey}
        onCopy={onCopy}
      />
    );
  }

  const section = stageApiSections.find((s) => s.id === sectionId);
  if (!section) return null;

  const sectionEndpoints = (section.endpointIds || [])
    .map((eid) => endpointById.get(eid))
    .filter((ep): ep is ApiEndpointDoc => !!ep);

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {section.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {section.summary}
        </p>
      </div>

      {section.paragraphs?.map((p) => (
        <p
          key={p}
          className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
        >
          {p}
        </p>
      ))}

      {section.bullets?.length ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-5 py-4 dark:border-violet-800/30 dark:bg-violet-900/20">
          <ul className="space-y-2.5 text-sm leading-relaxed text-violet-800 dark:text-violet-300">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sectionEndpoints.map((ep) => (
        <div key={ep.id} id={`endpoint-${ep.id}`}>
          <EndpointView
            endpoint={ep}
            language={language}
            onLanguageChange={onLanguageChange}
            copiedKey={copiedKey}
            onCopy={onCopy}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── main page ─── */

export function ApiDocsPage() {
  const [dark, setDark] = useDarkMode();
  const [language, setLanguage] = useState<ApiCodeLanguage>("curl");
  const { copiedKey, copy } = useCopyClipboard();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const [activeId, setActiveId] = useState<string>("getting-started");
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const { section, scrollTo } = resolveSection(hash);
      if (section) {
        setActiveId(section.id);
        setScrollToId(scrollTo);
      }
    }
  }, []);

  useEffect(() => {
    if (!scrollToId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`endpoint-${scrollToId}`);
      if (el && mainRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setScrollToId(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [scrollToId, activeId]);

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    for (const section of stageApiSections) {
      items.push({
        id: section.id,
        label: section.title,
        level: 1,
        icon: section.id === "getting-started" ? "rocket" : undefined,
      });
      for (const eid of section.endpointIds || []) {
        const ep = endpointById.get(eid);
        if (!ep) continue;
        items.push({ id: ep.id, label: ep.title, level: 2, method: ep.method });
      }
    }
    return items;
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (!h) return;
      const { section, scrollTo } = resolveSection(h);
      if (section) {
        setActiveId(section.id);
        setScrollToId(scrollTo);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      const { section, scrollTo } = resolveSection(id);
      if (section) {
        const isSameSection = activeId === section.id;
        setActiveId(section.id);
        window.history.replaceState(null, "", `#${id}`);
        setMobileSidebarOpen(false);

        if (scrollTo) {
          if (isSameSection) {
            const el = document.getElementById(`endpoint-${scrollTo}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            setScrollToId(scrollTo);
          }
        } else {
          if (mainRef.current) mainRef.current.scrollTop = 0;
        }
      }
    },
    [activeId]
  );

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>Stage API Docs</title>
        <meta
          name="description"
          content="Public API reference for Stage. Authenticate with API keys, import structured project plans, and read project, phase, and task data."
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="flex h-screen flex-col bg-white font-sans transition-colors dark:bg-slate-950">
      {/* Top bar */}
      <div className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center"
            >
              <img
                src={stageLogo}
                alt="Stage"
                className={cn("h-8 w-auto transition-[filter]", dark && "brightness-0 invert")}
              />
            </Link>
            <CaretRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-white">
              API Reference
            </span>
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
              v1
            </span>
          </div>
          <DarkModeToggle dark={dark} onToggle={() => setDark(!dark)} />
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 lg:block dark:border-slate-800">
          <div className="px-3 py-6">
            <SidebarNav
              items={navItems}
              activeId={scrollToId || activeId}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        {/* Mobile sidebar toggle */}
        <div className="fixed bottom-4 right-4 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700"
          >
            <BookOpen className="h-5 w-5" />
          </button>
        </div>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 shadow-xl dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  &times;
                </button>
              </div>
              <SidebarNav
                items={navItems}
                activeId={activeId}
                onSelect={handleSelect}
              />
            </div>
          </div>
        ) : null}

        {/* Main content */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-8 sm:px-8 lg:px-12"
        >
          <div className="mx-auto max-w-5xl pb-24">
            <SectionContent
              sectionId={activeId}
              scrollToId={scrollToId}
              language={language}
              onLanguageChange={setLanguage}
              copiedKey={copiedKey}
              onCopy={copy}
            />
          </div>
        </main>
      </div>
      </div>
    </>
  );
}
