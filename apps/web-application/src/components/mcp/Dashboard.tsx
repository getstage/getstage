import appleIcon from "@/assets/home/apple.svg";
import stageMarkWhite from "@/assets/home/stage-mark-white.svg";
import { cn } from "@/lib/utils";
import { MCP_TOOLS, McpCard, McpConnectCard, useMcpConnections } from "./McpConnectCard";

// Dashboard (Figma 2491-4955). The sidebar shell comes with the Integrations and Projects pages.
export function Dashboard() {
  const { connectedIds } = useMcpConnections();
  return (
    <div className="min-h-dvh bg-[#F5F5F5] p-1">
      <main className="min-h-[calc(100dvh-8px)] rounded-[8px] border-[0.5px] border-[#D4D4D4] bg-white px-4 py-11">
        <div className="mx-auto flex w-full max-w-[684px] flex-col gap-8">
          <header>
            <h1 className="text-[20px] font-semibold leading-[1.2] text-[#0A0A0A]">Welcome to Stage</h1>
            <p className="mt-1.5 text-[13px] font-medium text-[#737373]">Connect Stage to the AI tool you already use. Stage does the thinking, AI does the building.</p>
          </header>

          <section className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] p-3 shadow-[0_1px_4px_-2px_rgba(10,10,10,0.4)] sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] border border-[#6D67D3] bg-gradient-to-b from-[#5955A9] to-[#2F2A7D]">
              <img src={stageMarkWhite} alt="" className="h-6 w-auto" />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-[#171717]">Stage for Mac</p>
              <p className="text-[12px] text-[#525252]">The full experience: the 7-step canvas, project memory and exports, right on your Mac.</p>
            </div>
            <a
              href="/download/mac"
              className="flex items-center justify-center gap-2 rounded-[6px] border border-[#525252] bg-gradient-to-b from-[#404040] to-[#0A0A0A] px-3 py-2 text-[12px] font-medium text-[#FAFAFA]"
            >
              <img src={appleIcon} alt="" className="h-3.5 w-auto" />
              Download for MacOS
            </a>
          </section>

          <McpConnectCard />

          <McpCard title="Your Integrations">
            {MCP_TOOLS.filter((tool) => tool.icon).map((tool) => {
              const connected = connectedIds.has(tool.id);
              return (
                <div key={tool.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[13px] text-[#171717]">
                    <img src={tool.icon} alt="" className="size-4" />
                    {tool.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border-[0.5px] px-2.5 py-0.5 text-[12px]",
                      connected ? "border-[#34D399] bg-[#D1FAE5] text-[#022C22]" : "border-[#D4D4D4] bg-[#F5F5F5] text-[#737373]",
                    )}
                  >
                    {connected ? "Connected" : "Not Connected"}
                  </span>
                </div>
              );
            })}
          </McpCard>
        </div>
      </main>
    </div>
  );
}
