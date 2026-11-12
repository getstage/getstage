import { McpConnectCard } from "@/components/mcp/McpConnectCard";
import { SetupScreen, SetupSection, type SetupFooterProps } from "./SetupScreens";

// Web version of the Mac "Tech stack" step: what the Stage MCP lets your AI do, and how to add it.
const CAPABILITIES = [
  { title: "Knows your projects", body: "Reads your Stage projects and where each one stands." },
  { title: "Starts new projects", body: "Ask “Start a new Stage project for my app” and it sets one up." },
  { title: "Saves the work", body: "Research, strategy, style guide, flows and wireframes land in Stage, step by step." },
  { title: "You stay in control", body: "You choose the workspaces and read-only or read + edit when you sign in." },
];

export function ConnectToolStep({ footer }: { footer: SetupFooterProps }) {
  return (
    <SetupScreen step="connect" title="Connect Stage to your AI tool" footer={footer}>
      <SetupSection label="What your AI can do with Stage" className="grid gap-4 sm:grid-cols-2">
        {CAPABILITIES.map((item) => (
          <div key={item.title} className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[#171717]">{item.title}</span>
            <p className="text-[12px] leading-[1.4] text-[#525252]">{item.body}</p>
          </div>
        ))}
      </SetupSection>
      <McpConnectCard />
    </SetupScreen>
  );
}
