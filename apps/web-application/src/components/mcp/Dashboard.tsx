import appleIcon from "@/assets/home/apple.svg";
import noise from "@/assets/home/noise.png";
import stageMarkWhite from "@/assets/home/stage-mark-white.svg";
import { AppShell, Card, PageHeader, StatusBadge } from "./AppShell";
import { MCP_TOOLS, McpConnectCard, useMcpConnections } from "./McpConnectCard";

// Dashboard (Figma 2491-4955).
export function Dashboard() {
  const { connectedIds } = useMcpConnections();
  return (
    <AppShell page="dashboard">
      <PageHeader title="Welcome to Stage" subtitle="Connect Stage to the AI tool you already use, Stage does the thinking, AI does the building." />

      <section className="overflow-hidden rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-1 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
        <div className="relative flex flex-col overflow-hidden rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)]">
          <div className="relative h-[97px] overflow-hidden rounded-t-[6px] border-[0.5px] border-[#6D67D3] bg-gradient-to-b from-[#5955A9] to-[#2F2A7D]">
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-30 mix-blend-soft-light"
              style={{ backgroundImage: `url(${noise})`, backgroundSize: "1024px 1024px" }}
            />
            <img src={stageMarkWhite} alt="" className="absolute left-1/2 top-[36.69px] h-[22.617px] w-[18.848px] -translate-x-1/2" />
          </div>
          <div className="flex flex-col items-center gap-3 p-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <p className="text-[15px] font-semibold text-[#171717]">Stage for Mac</p>
              <p className="text-[12px] font-[450] text-[#525252] text-balance">The full experience: the 7-step canvas, project memory and exports, right on your Mac.</p>
            </div>
            <a
              href="/download/mac"
              className="flex items-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 py-2 text-[12px] font-medium text-[#FAFAFA] drop-shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)] [text-shadow:0_0.5px_0.5px_black]"
            >
              <img src={appleIcon} alt="" className="mb-[1.5px] h-[13px] w-[10.573px]" />
              Download for MacOS
            </a>
          </div>
        </div>
      </section>

      <McpConnectCard />

      <Card title="Your Integrations" aside={<a href="/app/integrations" className="text-[13px] font-medium leading-[1.5] text-[#525252] underline">Manage Integrations</a>}>
        {MCP_TOOLS.filter((tool) => tool.icon).map((tool) => (
          <div key={tool.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[13px] font-medium text-[#171717]">
              <img src={tool.icon} alt="" className="size-4" />
              {tool.name}
            </span>
            <StatusBadge status={connectedIds.has(tool.id) ? "connected" : "off"} />
          </div>
        ))}
      </Card>
    </AppShell>
  );
}
