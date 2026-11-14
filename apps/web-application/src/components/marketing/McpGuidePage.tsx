import { useState, type ReactNode } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import { LandingOverlays } from "@/components/stage-landing/markup/LandingOverlays";
import { Navigation } from "@/components/stage-landing/markup/Navigation";
import { SiteFooter } from "@/components/stage-landing/markup/SiteFooter";
import { useStageLanding } from "@/components/stage-landing/useStageLanding";
import { useCopyClipboard } from "@/hooks/useCopyClipboard";

const SERVER_URL = "https://mcp.getstage.co/mcp";
const SUPPORT_EMAIL = "support@getstage.co";

const tools = [
  ["See your account, projects and saved steps", "whoami, list_projects, get_project, get_research_inputs, get_step_results, get_run_status", "No"],
  ["Get the build brief for a project", "get_build_brief", "No"],
  ["Search real app and website screens", "search_references", "No"],
  ["Create a project", "create_project", "No"],
  ["Fill in and run Research", "set_research_inputs, start_research, save_research", "Yes, when the research is saved"],
  ["Add images to a moodboard", "add_to_moodboard", "Yes, the same as an import in Stage for Mac"],
  ["Save Strategy, Style guide, Flows and Wireframes", "save_strategy, save_style_guide, save_flows, save_wireframes", "No"],
] as const;

const sections = {
  "before-you-connect": "Before you connect",
  claude: "Connect in Claude",
  chatgpt: "Connect in ChatGPT",
  "coding-agents": "Connect in Claude Code, Codex or Cursor",
  workflow: "How it works",
  tools: "What your AI can do in Stage",
  examples: "Example prompts",
  permissions: "Permissions and privacy",
  disconnect: "Disconnect",
  troubleshooting: "Troubleshooting",
  support: "Support",
} as const;

function GuideSection({ id, children }: { id: keyof typeof sections; children: ReactNode }) {
  return (
    <section className="legal-section" id={id}>
      <h2>{sections[id]}</h2>
      {children}
    </section>
  );
}

function ServerUrl() {
  const { copiedKey, copy } = useCopyClipboard();
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyUrl() {
    setCopyFailed(false);
    setCopyFailed(!(await copy("server-url", SERVER_URL)));
  }

  return (
    <div className="mcp-guide-server">
      <span className="mcp-guide-label">Server URL</span>
      <div className="mcp-guide-server-value">
        <code>{SERVER_URL}</code>
        <button type="button" onClick={copyUrl} aria-label="Copy server URL">
          {copiedKey ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          {copiedKey ? "Copied" : "Copy URL"}
        </button>
      </div>
      <span role="status" className={copyFailed ? "mcp-guide-copy-error" : "sr-only"}>
        {copyFailed ? "Could not copy the URL. Select and copy it manually." : copiedKey ? "Server URL copied." : ""}
      </span>
    </div>
  );
}

export function McpGuidePage() {
  useStageLanding({ bodyClass: "legal-page mcp-guide-page" });

  return (
    <>
      <div id="top" />
      <a className="skip-link" href="#main">Skip to content</a>
      <Navigation />
      <main className="legal-main mcp-guide-main" id="main">
        <div className="legal-content">
          <header className="legal-hero">
            <span className="legal-eyebrow">MCP</span>
            <h1>Use Stage inside Claude and ChatGPT</h1>
            <p><strong>Stage does the thinking. Your AI does the building.</strong></p>
            <p>Connect Stage once, and your AI tool can run the whole design process in your Stage project: research, strategy, moodboard and style guide, flows and wireframes. When the plan is ready, it builds from one brief instead of guessing.</p>
            <ServerUrl />
          </header>

          <div className="mcp-guide-content">
            <nav className="mcp-guide-toc" aria-label="On this page">
              <span className="mcp-guide-label">On this page</span>
              <ul>
                {Object.entries(sections).map(([id, title]) => (
                  <li key={id}><a href={`#${id}`}>{title}</a></li>
                ))}
              </ul>
            </nav>

            <article className="legal-document" aria-label="Stage MCP guide">
              <GuideSection id="before-you-connect">
                <ul>
                  <li>You need a Stage account with an active plan or free trial.</li>
                  <li>Research runs and moodboard imports use the AI credits included in your Stage plan. Reading your projects and saved steps does not use credits.</li>
                  <li>Stage for Mac is optional. It is where you review each step and export to Figma and Paper.</li>
                </ul>
              </GuideSection>

              <GuideSection id="claude">
                {/* After directory approval, update the custom setup steps to show how to find Stage in the directory. */}
                <ol>
                  <li>In Claude, open <strong>Customize</strong>, then <strong>Connectors</strong>.</li>
                  <li>Click <strong>Add</strong>, then choose <strong>Custom</strong> and <strong>Web</strong>.</li>
                  <li>Name the connector <strong>Stage</strong>, paste <code>{SERVER_URL}</code>, and click <strong>Continue</strong>.</li>
                  <li>Review the detected authentication settings and click <strong>Continue</strong>. Select <strong>Sign in now</strong> and <strong>Register automatically</strong>, then click <strong>Add</strong>.</li>
                  <li>Sign in to Stage. Choose the workspaces and permissions Claude can use, then click <strong>Allow</strong>.</li>
                </ol>
                <p>On Claude Team and Enterprise plans, an owner may need to add the connector for the organization first.</p>
              </GuideSection>

              <GuideSection id="chatgpt">
                <p>Add Stage as a custom MCP server in ChatGPT on the web. Your account and workspace settings determine whether you can add custom servers.</p>
                <ol>
                  <li>Open <a href="https://chatgpt.com/plugins">ChatGPT Plugins</a>, select the plus button, then choose <strong>Add custom MCP server</strong>.</li>
                  <li>Name it <strong>Stage</strong>. Under <strong>Connection</strong>, paste <code>{SERVER_URL}</code> as the server URL.</li>
                  <li>Select <strong>OAuth</strong> for authentication. Review the risk warning, select <strong>I understand and want to continue</strong>, then select <strong>Create as a plugin</strong>.</li>
                  <li>When prompted, sign in to Stage, choose the workspaces and permissions ChatGPT can use, and select <strong>Allow</strong>.</li>
                  <li>Open Stage in your personal plugins and install it. In a new Work chat, type <code>@</code> and select <strong>Stage</strong>.</li>
                </ol>
              </GuideSection>

              <GuideSection id="coding-agents">
                <h3>Claude Code</h3>
                <pre><code>{`claude mcp add --transport http stage ${SERVER_URL}`}</code></pre>
                <p>Then run <code>/mcp</code> in Claude Code and sign in to Stage.</p>

                <h3>Codex</h3>
                <p>Add to <code>~/.codex/config.toml</code>.</p>
                <pre><code>{`[mcp_servers.stage]\nurl = "${SERVER_URL}"`}</code></pre>
                <p>Then run <code>codex mcp login stage</code> and sign in to Stage.</p>

                <h3>Cursor</h3>
                <p>Add to <code>~/.cursor/mcp.json</code>.</p>
                <pre><code>{JSON.stringify({ mcpServers: { stage: { url: SERVER_URL } } }, null, 2)}</code></pre>
                <p>Then open Cursor's MCP settings, click <strong>Connect</strong> next to Stage and sign in.</p>

                <h3>Other MCP clients</h3>
                <p>Add a remote server with the URL <code>{SERVER_URL}</code>. Stage uses OAuth, so you sign in to Stage in your browser and approve access.</p>
              </GuideSection>

              <GuideSection id="workflow">
                <p>Stage runs a project in six steps. Each one builds on the ones before it, and you review and approve every step in Stage.</p>
                <ol>
                  <li><strong>Research.</strong> Your AI benchmarks your website and up to four competitors, and Stage collects real UI patterns for the screens you need.</li>
                  <li><strong>Strategy.</strong> Direction, design principles, audience, content rules, positioning and the key pages, grounded in the research.</li>
                  <li><strong>Moodboard and Style guide.</strong> Your AI picks real app and website screens for a visual direction, then writes its style guide: colors, fonts, type scale, layout, and do and don't rules.</li>
                  <li><strong>Flows.</strong> The screens of your product and how they connect, or the sitemap for a website.</li>
                  <li><strong>Wireframes.</strong> The sections of each screen, with real copy from the strategy.</li>
                  <li><strong>Delivery.</strong> One build brief that gathers everything, so your AI builds the product from your research and direction.</li>
                </ol>
              </GuideSection>

              <GuideSection id="tools">
                <table className="mcp-guide-tools" aria-label="Stage MCP tools and credit usage">
                  <thead>
                    <tr><th scope="col">What</th><th scope="col">Tools</th><th scope="col">Credits</th></tr>
                  </thead>
                  <tbody>
                    {tools.map(([action, names, credits]) => (
                      <tr key={action}>
                        <th scope="row">{action}</th>
                        <td>{names.split(", ").map((name, index) => (
                          <span key={name}>{index > 0 ? ", " : ""}<code>{name}</code></span>
                        ))}</td>
                        <td>{credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>Saving a step replaces the previous version of that step. If later steps were built on the old version, Stage tells your AI, and your AI should ask you before redoing them. Stage has no tool that deletes projects or changes your plan.</p>
              </GuideSection>

              <GuideSection id="examples">
                <ul>
                  <li>"Use Stage to set up a project for my habit-tracking app and run the research step."</li>
                  <li>"Write the strategy and flows for my Stage project, based on its research."</li>
                  <li>"Find calm, editorial app screens, add the best six to a direction called Calm Editorial, and write its style guide."</li>
                  <li>"Get the build brief for my Stage project and start building the app from it."</li>
                </ul>
              </GuideSection>

              <GuideSection id="permissions">
                <p>When you connect, Stage shows which workspaces and permissions the AI tool will get, and you choose what to allow. Stage only receives what the AI tool sends when it uses a Stage tool. It does not receive your full conversation or your chat history. Read the <a href="/privacy">Privacy Policy</a> for details.</p>
              </GuideSection>

              <GuideSection id="disconnect">
                <p>Remove Stage from the connector or MCP settings of your AI tool. You can also disconnect individual AI tools from <a href="/app/integrations">Integrations in Stage</a>. To revoke every connection at once, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
              </GuideSection>

              <GuideSection id="troubleshooting">
                <ul>
                  <li><strong>"Pick a plan to connect" appears when you sign in.</strong> Your Stage account needs an active plan or free trial to connect an AI tool.</li>
                  <li><strong>Research or a moodboard import is still running.</strong> These run in the background and usually finish within a minute. Your AI checks their status until they are done.</li>
                  <li><strong>Stage refuses to save a step.</strong> Each step needs the steps before it. For example, Wireframes need Strategy and Flows. Ask your AI to run the missing step first.</li>
                  <li><strong>The sign-in window does not come back to your AI tool.</strong> Close it and click Connect again in your AI tool.</li>
                </ul>
              </GuideSection>

              <GuideSection id="support">
                <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
              </GuideSection>
            </article>
          </div>
        </div>
      </main>
      <SiteFooter />
      <LandingOverlays />
    </>
  );
}
