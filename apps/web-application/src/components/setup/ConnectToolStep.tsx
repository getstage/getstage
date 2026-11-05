import { useState } from "react";
import { useQuery } from "convex/react";
import claudeCodeIcon from "@/assets/home/claude-tool.svg";
import openaiIcon from "@/assets/home/openai.svg";
import { api } from "@/lib/convex";
import { getMcpOrigin } from "@/lib/mcp";
import { RadioDot, SetupScreen, SetupSection, secondaryButtonClass, type SetupFooterProps } from "./SetupScreens";

// Web version of the Mac "Tech stack" step: instead of finding programs on the computer, a tool
// counts as connected once it has called Stage over MCP.
const TOOLS = [
  { id: "claude code", name: "Claude Code", icon: claudeCodeIcon, how: "Run in your terminal:", command: (url: string) => `claude mcp add --transport http stage ${url}` },
  { id: "codex", name: "Codex", icon: "/logos/integrations/codex.svg", how: "Run in your terminal:", command: (url: string) => `codex mcp add stage --url ${url}` },
  { id: "claude", name: "Claude", icon: "/logos/integrations/claude.svg", how: "Settings → Connectors → Add custom connector, then paste:", command: (url: string) => url },
  { id: "chatgpt", name: "ChatGPT", icon: openaiIcon, how: "Settings → Connectors → Create, then paste:", command: (url: string) => url },
  { id: "cursor", name: "Cursor", icon: "/logos/integrations/cursor.svg", how: "Settings → MCP → Add server, then paste:", command: (url: string) => url },
];

// MCP clients name themselves ("Claude Code", "claude-code", "Cursor", …); "claude code" is checked before "claude".
function toolIdOf(clientName: string) {
  const name = clientName.toLowerCase().replace(/[-_]/g, " ");
  return TOOLS.find((tool) => name.includes(tool.id))?.id;
}

export function ConnectToolStep({ footer, onSkip }: { footer?: SetupFooterProps; onSkip?: () => void }) {
  const connections = useQuery(api.developer.mcpConnect.listConnections);
  const mcpOrigin = getMcpOrigin();
  const called = connections?.filter((connection) => connection.lastUsedAt) ?? [];
  const connectedIds = new Set(called.map((connection) => toolIdOf(connection.clientName)));
  const status = called.length ? `Connected: ${called.map((connection) => connection.clientName).join(", ")}` : "Waiting for your AI tool to call Stage…";

  return (
    <SetupScreen
      step="connect"
      title="Connect Stage to your AI tool"
      footer={footer && { ...footer, continueEnabled: footer.continueEnabled && called.length > 0 }}
      secondaryAction={onSkip && !called.length ? { label: "Skip for now", onClick: onSkip } : undefined}
    >
      {mcpOrigin ? (
        <SetupSection label="Add Stage once. The first time your tool uses it, you sign in and allow access." className="gap-4">
          {TOOLS.map((tool) => (
            <div key={tool.id} className="flex items-start gap-2.5">
              <span className="flex py-px">
                <RadioDot checked={connectedIds.has(tool.id)} emptyClassName="bg-[#F5F5F5]" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <img src={tool.icon} alt="" className="size-4" />
                  <span className="text-[13px] font-medium text-[#171717]">{tool.name}</span>
                </div>
                <p className="text-[12px] leading-[1.3] text-[#525252]">{tool.how}</p>
                <CopyField value={tool.command(`${mcpOrigin}/mcp`)} />
              </div>
            </div>
          ))}
        </SetupSection>
      ) : (
        <p className="text-[13px] font-medium text-[#DC2626]">Connecting AI tools isn't available on this address.</p>
      )}
      <p role="status" className="px-1 text-[12px] font-medium text-[#525252]">{status}</p>
    </SetupScreen>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-1 flex items-center gap-2 rounded-[6px] bg-[#F5F5F5] py-1 pl-2.5 pr-1">
      <code className="min-w-0 flex-1 truncate text-[12px] text-[#171717]">{value}</code>
      <button type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))} className={secondaryButtonClass}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
