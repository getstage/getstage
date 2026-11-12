import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export type Env = {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  /** This server, e.g. https://mcp.getstage.co */
  MCP_ORIGIN: string;
  /** The Stage web app with the "Connect your AI tool" page. */
  STAGE_APP_ORIGIN: string;
  /** Convex HTTP actions: the Stage API and the connect-code exchange. */
  CONVEX_SITE_ORIGIN: string;
};

/** Stored encrypted with each grant; tools read it from the auth context. */
export type StageProps = {
  userId: string;
  /** The user's MCP key for the Stage API. Revoking it in Stage disconnects the tool. */
  apiKey: string;
  /** Steps the user allowed at sign-in (Stage enforces them too). Missing on connections from before permissions. */
  permissions?: string[];
};
