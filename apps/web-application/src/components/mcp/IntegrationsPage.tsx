import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import copyDarkIcon from "@/assets/home/copy-dark.svg";
import figmaIcon from "@/assets/home/figma.svg";
import paperIcon from "@/assets/home/paper.svg";
import tabComponents from "@/assets/home/tab-components.svg";
import tabMarketplace from "@/assets/home/tab-marketplace.svg";
import tabSkills from "@/assets/home/tab-skills.svg";
import tabTools from "@/assets/home/tab-tools.svg";
import { api } from "@/lib/convex";
import { formatRelative, getMcpOrigin } from "@/lib/mcp";
import { cn } from "@/lib/utils";
import { AppShell, Card, MaskIcon, PageHeader, StatusBadge } from "./AppShell";
import { MCP_TOOLS, useMcpConnections } from "./McpConnectCard";

// Integrations → Tools (Figma 2491-5129). Skills, Components and Marketplace open the existing pages.
const TABS = [
  { label: "Tools", icon: tabTools, href: "/app/integrations" },
  { label: "Skills", icon: tabSkills, href: "/skills" },
  { label: "Components", icon: tabComponents, href: "/component-libraries" },
  { label: "Marketplace", icon: tabMarketplace, href: "/marketplace" },
];

const TOOL_DESCRIPTION: Record<string, string> = {
  claude: "Desktop and web app",
  chatgpt: "Custom Connector",
  cursor: "MCP server",
  codex: "Command line",
  "claude code": "Command line",
};

export function IntegrationsPage() {
  const { forTool } = useMcpConnections();
  const disconnect = useMutation(api.developer.mcpConnect.disconnect);
  const mcpUrl = `${getMcpOrigin() ?? ""}/mcp`;

  return (
    <AppShell page="integrations">
      <div className="flex flex-col gap-3">
        <PageHeader title="Integrations" subtitle="Manage your tools, skills and libraries all in one place" />
        <nav className="flex gap-2 self-start rounded-[8px] bg-[#F5F5F5] p-[2px]">
          {TABS.map((tab, index) => (
            <a
              key={tab.label}
              href={tab.href}
              aria-current={index === 0 ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-[6px] py-1.5 pl-2.5 pr-3 text-[13px] font-medium",
                index === 0 ? "bg-gradient-to-b from-[#8D87FF] to-[#7B76DF] text-white drop-shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]" : "text-[#737373] hover:text-[#171717]",
              )}
            >
              <MaskIcon src={tab.icon} className="size-[15px]" />
              {tab.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <Card
          title="AI Tools"
          subtitle="Connected through the Stage MCP"
          aside={<CopyUrlButton value={mcpUrl} />}
          bodyClassName="gap-4 p-5"
        >
          {MCP_TOOLS.filter((tool) => tool.icon).map((tool) => {
            const connections = forTool(tool.id);
            const lastCall = connections.find((connection) => connection.lastUsedAt)?.lastUsedAt;
            const connected = connections.length > 0;
            return (
              <ToolRow
                key={tool.id}
                icon={tool.icon}
                name={tool.name}
                status={connected ? "connected" : "off"}
                detail={lastCall ? `last call ${formatRelative(lastCall)}` : TOOL_DESCRIPTION[tool.id] ?? ""}
                on={connected}
                onToggle={() => {
                  if (connected) void disconnect({ ids: connections.map((connection) => connection.id) });
                  else window.location.assign(`/app?tool=${encodeURIComponent(tool.id)}`);
                }}
                toggleLabel={connected ? `Disconnect ${tool.name}` : `Set up ${tool.name}`}
              />
            );
          })}
          <div className="h-px bg-[#E5E5E5]" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-medium text-[#171717]">Any other AI tool</p>
              <p className="text-[12px] text-[#525252]">Works with any client that supports remote MCP</p>
            </div>
            <a href="/app?tool=other" className="rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-2.5 py-1 text-[12px] font-medium text-[#171717] shadow-[0_1px_5px_-3.5px_rgba(0,0,0,0.5)]">
              Instructions
            </a>
          </div>
        </Card>

        <DesignTools />
      </div>
    </AppShell>
  );
}

function DesignTools() {
  const status = useQuery(api.integrations.contentPlatforms.getNativeConnectionStatus);
  const startConnect = useAction(api.integrations.contentPlatforms.startOAuthConnect);
  const disconnect = useMutation(api.integrations.contentPlatforms.disconnectConnection);
  const [error, setError] = useState<string>();
  const figmaConnected = status?.figma?.status === "active";

  const toggleFigma = async () => {
    setError(undefined);
    try {
      if (figmaConnected) await disconnect({ provider: "figma" });
      else {
        const { url } = await startConnect({ provider: "figma" });
        if (url) window.location.assign(url);
      }
    } catch {
      setError("Could not change the Figma connection. Try again.");
    }
  };

  return (
    <Card title="Design Tools" subtitle="Stage uses these for research, references and handoff" bodyClassName="gap-4 p-5">
      <ToolRow
        icon="/logos/integrations/mobbin.svg"
        iconClassName="h-[7.367px] w-4"
        name="Mobbin"
        status="off"
        detail="Real app and web references for research and moodboards"
        on={false}
        disabled
        toggleLabel="Mobbin is coming soon"
      />
      <ToolRow
        icon={figmaIcon}
        iconClassName="h-[13.5px] w-[9px]"
        name="Figma"
        status={figmaConnected ? "connected" : "off"}
        detail="Native design export and handoff"
        on={figmaConnected}
        onToggle={() => void toggleFigma()}
        toggleLabel={figmaConnected ? "Disconnect Figma" : "Connect Figma"}
      />
      <ToolRow
        icon={paperIcon}
        iconClassName="size-[13px]"
        name="Paper"
        status="warning"
        detail="Exporting designs and handing them off made easy!"
        on={false}
        disabled
        toggleLabel="Paper connects from Stage for Mac"
      />
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </Card>
  );
}

function ToolRow({ icon, iconClassName, name, status, detail, on, disabled, onToggle, toggleLabel }: {
  icon?: string;
  iconClassName?: string;
  name: string;
  status: "connected" | "off" | "warning";
  detail: string;
  on: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  toggleLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="flex h-[18px] w-[15.853px] shrink-0 items-center justify-center">
          {icon ? <img src={icon} alt="" className={iconClassName ?? "size-4"} /> : null}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-[#171717]">{name}</span>
            <StatusBadge status={status} size="sm" />
          </span>
          <span className="text-[12px] text-[#525252]">{detail}</span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={toggleLabel}
        title={toggleLabel}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "flex w-[30px] shrink-0 items-center rounded-full p-[2px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          on ? "justify-end bg-[#DBD9FC]" : "justify-start bg-[#E5E5E5]",
        )}
      >
        <span className={cn("size-3 rounded-full", on ? "bg-[#221E6C]" : "bg-[#737373]")} />
      </button>
    </div>
  );
}

function CopyUrlButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(value).then(() => setCopied(true))}
      className="flex shrink-0 items-center gap-1.5 rounded-[4px] border-[0.5px] border-[#D4D4D4] bg-white py-1.5 pl-2 pr-3 text-[12px] font-medium text-[#0A0A0A] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)]"
    >
      <img src={copyDarkIcon} alt="" className="size-3.5" />
      {copied ? "Copied" : "Copy MCP URL"}
    </button>
  );
}
