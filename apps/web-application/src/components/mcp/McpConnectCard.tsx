import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import claudeCodeIcon from "@/assets/home/claude-tool.svg";
import openaiIcon from "@/assets/home/openai.svg";
import waitingIcon from "@/assets/home/status-waiting.svg";
import { api } from "@/lib/convex";
import { getMcpOrigin } from "@/lib/mcp";
import { cn } from "@/lib/utils";

// "Connect the Stage MCP" (Figma Dashboard 2491-4955). A tool counts as connected once it has called Stage.
const SIGN_IN = "Sign in to Stage when the browser opens.";
const FIRST_ASK = "Then ask your AI: “Start a new Stage project for my app”. The status above turns green on the first call.";

export const MCP_TOOLS = [
  { id: "claude code", name: "Claude Code", icon: claudeCodeIcon, steps: ["Open your terminal in your project folder.", "Run the command below.", `Start Claude Code. ${SIGN_IN}`, FIRST_ASK] },
  { id: "codex", name: "Codex", icon: "/logos/integrations/codex.svg", steps: ["Open your terminal in your project folder.", "Run the command below.", `Start Codex. ${SIGN_IN}`, FIRST_ASK] },
  { id: "claude", name: "Claude", icon: "/logos/integrations/claude.svg", steps: ["In Claude, open Settings → Connectors → Add custom connector.", "Paste the URL below.", SIGN_IN, FIRST_ASK] },
  { id: "chatgpt", name: "ChatGPT", icon: openaiIcon, steps: ["In ChatGPT, open Settings → Connectors → Create.", "Paste the URL below.", SIGN_IN, FIRST_ASK] },
  { id: "cursor", name: "Cursor", icon: "/logos/integrations/cursor.svg", steps: ["In Cursor, open Settings → MCP → Add new MCP server.", "Paste the URL below.", SIGN_IN, FIRST_ASK] },
  { id: "other", name: "Other", icon: undefined, steps: ["Any AI tool that supports remote MCP servers works.", "Add the URL below as a remote (HTTP) server.", SIGN_IN, FIRST_ASK] },
] as const;

// MCP clients name themselves ("Claude Code", "claude-code", "Cursor", …); "claude code" is checked before "claude".
function mcpToolIdOf(clientName: string) {
  const name = clientName.toLowerCase().replace(/[-_]/g, " ");
  return MCP_TOOLS.find((tool) => name.includes(tool.id))?.id;
}

export function useMcpConnections() {
  const connections = useQuery(api.developer.mcpConnect.listConnections);
  const called = connections?.filter((connection) => connection.lastUsedAt) ?? [];
  return { called, connectedIds: new Set(called.map((connection) => mcpToolIdOf(connection.clientName))) };
}

export function McpCard({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[13px] font-medium text-[#0A0A0A]">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="flex flex-col gap-4 rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white p-3">{children}</div>
    </section>
  );
}

export function McpConnectCard() {
  const [toolId, setToolId] = useState<(typeof MCP_TOOLS)[number]["id"]>("claude code");
  const { called } = useMcpConnections();
  const mcpOrigin = getMcpOrigin();
  const tool = MCP_TOOLS.find((entry) => entry.id === toolId) ?? MCP_TOOLS[0];
  const url = `${mcpOrigin}/mcp`;
  const command = toolId === "claude code" ? `claude mcp add --transport http stage ${url}` : toolId === "codex" ? `codex mcp add stage --url ${url}` : url;

  const status = called.length ? (
    <span className="flex items-center gap-1.5 text-[12px] text-[#047857]"><span className="size-2 rounded-full bg-[#34D399]" />Connected</span>
  ) : (
    <span className="flex items-center gap-1.5 text-[12px] text-[#737373]"><img src={waitingIcon} alt="" className="size-2.5" />Waiting for first connection</span>
  );

  if (!mcpOrigin) {
    return <McpCard title="Connect the Stage MCP"><p className="text-[13px] font-medium text-[#DC2626]">Connecting AI tools isn't available on this address.</p></McpCard>;
  }

  return (
    <McpCard title="Connect the Stage MCP" aside={status}>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[#171717]">Your MCP server URL</span>
        <div className="flex items-center gap-2 rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate text-[12px] text-[#525252]">{url}</code>
          <CopyButton value={url} />
        </div>
      </div>
      <ol className="list-decimal pl-5 text-[12px] leading-[1.6] text-[#525252]">
        {tool.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div role="tablist" aria-label="AI tool" className="flex flex-wrap gap-2">
        {MCP_TOOLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === toolId}
            onClick={() => setToolId(entry.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 py-1 text-[13px] font-medium transition-colors",
              entry.id === toolId ? "border-[#463FBA] bg-[rgba(123,118,223,0.15)] text-[#463FBA]" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#171717] hover:bg-white",
            )}
          >
            {entry.icon ? <img src={entry.icon} alt="" className="size-3.5" /> : null}
            {entry.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[6px] bg-[#0A0A0A] py-1.5 pl-3 pr-1.5">
        <code className="min-w-0 flex-1 truncate text-[12px] text-white">{command}</code>
        <CopyButton value={command} />
      </div>
    </McpCard>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
      className="shrink-0 rounded-[4px] border-[0.5px] border-[#D4D4D4] bg-white px-2.5 py-1 text-[12px] font-medium text-[#0A0A0A]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
