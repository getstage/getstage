import { useEffect } from "react";
import { StageLandingMarkup } from "./StageLandingMarkup";
import { useStageLanding } from "./useStageLanding";
import { mountMcpGuide } from "./mcp/mcp-connect.js";
import "./mcp/mcp-connect.css";
import "./mcp/mcp-motion.css";

const TITLE = "Stage | Think through your product before your AI builds it";
const DESCRIPTION =
  "Work through research, strategy, visual direction, flows and wireframes in Stage for Mac. Export a Markdown brief for Cursor, Claude Code or Codex.";

const MCP_SERVER_URL = import.meta.env.MODE === "production"
  ? "https://mcp.getstage.co/mcp"
  : "https://mcp-testing.getstage.co/mcp";

export function StageLandingPage() {
  useStageLanding({
    title: TITLE,
    description: DESCRIPTION,
    experience: true,
  });

  useEffect(() => mountMcpGuide(MCP_SERVER_URL), []);

  return <StageLandingMarkup />;
}
