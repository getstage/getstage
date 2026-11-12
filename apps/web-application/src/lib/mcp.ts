// The MCP server that belongs to this web app. A connect code only ever goes back to it.
const MCP_ORIGINS: Record<string, string> = {
  "getstage.co": "https://mcp.getstage.co",
  "www.getstage.co": "https://mcp.getstage.co",
  "testing.getstage.co": "https://mcp-testing.getstage.co",
  localhost: "http://localhost:8787",
};

export function getMcpOrigin(): string | undefined {
  return MCP_ORIGINS[window.location.hostname];
}

/** The server URL people paste into their AI tool (landing page guide); other hosts show the live one. */
export function mcpServerUrl() {
  return `${getMcpOrigin() ?? MCP_ORIGINS["getstage.co"]}/mcp`;
}

// Same rule as the backend (`planAllowsKey("mcp", …)`): every paid plan includes the MCP.
export function hasMcpPlan(plan: string) {
  return plan === "start" || plan === "pro" || plan === "team";
}

// "2 minutes ago", "yesterday", … for "last call" and "Last Updated".
export function formatRelative(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
