import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { DESIGN_LIBRARY_MCP, refreshDesignLibraryTokens } from "../../helpers/integrations/designLibraryOAuth";
import type { DesignLibrary } from "../../models/integrations/contentPlatforms";
import { encryptSecret } from "../credentialVault";
import { searchDetailsInspirations } from "./details";
import { LibraryUnavailableError } from "./mcpTools";
import { type LibraryScreen, type MobbinSearch, searchMobbin } from "./mobbin";

// The user's own Mobbin or Details login, for searches made on their behalf (their account, their credits).

/** Renew a little before the token runs out, so a search never starts with one that expires midway. */
const RENEW_BEFORE_MS = 60_000;

/** The user's access token for the library, renewed when needed; null when they haven't connected it (or must reconnect). */
export async function designLibraryToken(ctx: ActionCtx, userId: Id<"users">, library: DesignLibrary): Promise<string | null> {
  const connection = await ctx.runQuery(internal.integrations.contentPlatforms.getConnectionTokenForProvider, { userId, provider: library });
  if (!connection || connection.status !== "active" || !connection.accessToken) return null;
  const fresh = !connection.accessTokenExpiresAt || connection.accessTokenExpiresAt - RENEW_BEFORE_MS > Date.now();
  if (fresh) return connection.accessToken;
  if (!connection.refreshToken || !connection.oauthClientId) return null;

  try {
    const tokens = await refreshDesignLibraryTokens(library, { clientId: connection.oauthClientId, refreshToken: connection.refreshToken });
    const encrypted = await encryptSecret(JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
    await ctx.runMutation(internal.integrations.contentPlatforms.storeRenewedTokens, {
      connectionId: connection.connectionId,
      encryptedTokenPayload: encrypted.encryptedValue,
      encryptionIv: encrypted.encryptionIv,
      accessTokenExpiresAt: tokens.expiresAt,
    });
    return tokens.accessToken;
  } catch {
    await ctx.runMutation(internal.integrations.contentPlatforms.markConnectionExpired, {
      connectionId: connection.connectionId,
      message: `${DESIGN_LIBRARY_MCP[library].label} signed Stage out. Connect it again in Integrations.`,
    });
    return null;
  }
}

export type LibrarySearch = ({ library: "mobbin" } & MobbinSearch) | { library: "details"; query: string };

/** Searches the library with the user's own account; LibraryUnavailableError when it isn't connected. */
export async function searchDesignLibrary(ctx: ActionCtx, userId: Id<"users">, search: LibrarySearch): Promise<LibraryScreen[]> {
  const token = await designLibraryToken(ctx, userId, search.library);
  if (!token) throw new LibraryUnavailableError(`Connect ${DESIGN_LIBRARY_MCP[search.library].label} in Stage → Integrations to search it.`);
  return search.library === "details" ? searchDetailsInspirations(token, search.query) : searchMobbin(token, search);
}
