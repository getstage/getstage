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

// Same rule as the backend (`planAllowsKey("mcp", …)`): every paid plan includes the MCP.
export function hasMcpPlan(plan: string) {
  return plan === "start" || plan === "pro" || plan === "team";
}
