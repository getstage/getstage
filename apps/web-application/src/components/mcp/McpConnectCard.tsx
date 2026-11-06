import { useState } from "react";
import { useQuery } from "convex/react";
import claudeCodeIcon from "@/assets/home/claude-tool.svg";
import copyDarkIcon from "@/assets/home/copy-dark.svg";
import copyIcon from "@/assets/home/copy.svg";
import openaiIcon from "@/assets/home/openai.svg";
import waitingIcon from "@/assets/home/status-waiting.svg";
import { api } from "@/lib/convex";
import { getMcpOrigin } from "@/lib/mcp";
import { cn } from "@/lib/utils";
import { Card } from "./AppShell";

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
  const active = connections ?? [];
  const called = active.filter((connection) => connection.lastUsedAt);
  return {
    called,
    connectedIds: new Set(called.map((connection) => mcpToolIdOf(connection.clientName))),
    // Every active connection of one tool, newest call first (for "last call …" and Disconnect).
    forTool: (toolId: string) => active
      .filter((connection) => mcpToolIdOf(connection.clientName) === toolId)
      .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)),
  };
}

export function McpConnectCard() {
  // `/app?tool=cursor` (from Integrations → Setup) opens on that tool.
  const [toolId, setToolId] = useState<(typeof MCP_TOOLS)[number]["id"]>(() => {
    const requested = new URLSearchParams(window.location.search).get("tool");
    return MCP_TOOLS.find((tool) => tool.id === requested)?.id ?? "claude code";
  });
  const { called } = useMcpConnections();
  const mcpOrigin = getMcpOrigin();
  const tool = MCP_TOOLS.find((entry) => entry.id === toolId) ?? MCP_TOOLS[0];
  const url = `${mcpOrigin}/mcp`;
  const command = toolId === "claude code" ? `claude mcp add --transport http stage ${url}` : toolId === "codex" ? `codex mcp add stage --url ${url}` : url;

  const status = called.length ? (
    <span className="flex items-center gap-2 text-[12px] leading-[1.5] text-[#047857]"><span className="size-2.5 rounded-full bg-[#34D399]" />Connected</span>
  ) : (
    <span className="flex items-center gap-2 text-[12px] leading-[1.5] text-[#737373]"><img src={waitingIcon} alt="" className="size-2.5" />Waiting for first connection</span>
  );

  if (!mcpOrigin) {
    return <Card title="Connect the Stage MCP"><p className="text-[13px] font-medium text-[#DC2626]">Connecting AI tools isn't available on this address.</p></Card>;
  }

  return (
    <Card title="Connect the Stage MCP" aside={status} bodyClassName="gap-5 p-3">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[#171717]">Your MCP server URL</span>
        <div className="flex items-center gap-2 rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-3 py-2.5 shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.5)]">
          <span className="min-w-0 flex-1 truncate text-[12px] text-[#525252]">{url}</span>
          <CopyButton value={url} />
        </div>
      </div>
      <ol className="list-decimal ps-[18px] text-[12px] leading-[1.6] text-[#525252]">
        {tool.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div className="flex flex-col gap-1.5">
      <div role="tablist" aria-label="AI tool" className="flex flex-wrap gap-1.5">
        {MCP_TOOLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === toolId}
            onClick={() => setToolId(entry.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 py-1 text-[13px] font-medium shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)] transition-colors",
              entry.id === toolId ? "border-[#463FBA] bg-[rgba(123,118,223,0.15)] text-[#463FBA]" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#171717] hover:bg-white",
            )}
          >
            {entry.icon ? <img src={entry.icon} alt="" className="size-3.5" /> : null}
            {entry.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[6px] border-[0.5px] border-[#262626] bg-[#0A0A0A] p-1 shadow-[0_1px_4px_-2.5px_rgba(10,10,10,0.5)]">
        <span className="min-w-0 flex-1 truncate px-2 text-[12px] font-medium text-white">{command}</span>
        <CopyButton value={command} label="Copy Link" />
      </div>
      </div>
    </Card>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label ? undefined : "Copy"}
      onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
      className={cn(
        "flex shrink-0 items-center gap-1.5 text-[12px] font-medium",
        label ? "rounded-[4px] bg-white py-1.5 pl-2 pr-3 text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]" : "text-[#525252] hover:text-[#0A0A0A]",
      )}
    >
      <img src={label ? copyDarkIcon : copyIcon} alt="" className="size-3.5" />
      {copied ? "Copied" : label}
    </button>
  );
}
