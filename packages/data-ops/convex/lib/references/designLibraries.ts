import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { DESIGN_LIBRARY_MCP, SignInRejectedError, refreshDesignLibraryTokens } from "../../helpers/integrations/designLibraryOAuth";
import type { DesignLibrary } from "../../models/integrations/contentPlatforms";
import { encryptSecret } from "../credentialVault";
import { searchDetailsInspirations } from "./details";
import { LibraryUnavailableError } from "./mcpTools";
import { type LibraryScreen, type MobbinSearch, searchMobbin } from "./mobbin";
import { searchReferoScreens } from "./refero";
import { sharedReferoToken } from "./sharedRefero";

// The user's own Mobbin, Refero or Details login, for searches made on their behalf (their account, their credits).

type Ctx = Pick<ActionCtx, "runAction" | "runQuery" | "runMutation">;

/** Renew a little before the token runs out, so a search never starts with one that expires midway. */
const RENEW_BEFORE_MS = 60_000;

function signedOut(ctx: Ctx, connection: { connectionId: Id<"nativeIntegrationConnections">; version: number }, library: DesignLibrary) {
  return ctx.runMutation(internal.integrations.contentPlatforms.markConnectionExpired, {
    connectionId: connection.connectionId,
    version: connection.version,
    message: `${DESIGN_LIBRARY_MCP[library].label} signed Stage out. Connect it again in Integrations.`,
  });
}

/** The user's access token for the library, renewed when needed; null when they haven't connected it (or must reconnect). */
export async function designLibraryToken(ctx: Ctx, userId: Id<"users">, library: DesignLibrary): Promise<string | null> {
  const connection = await ctx.runQuery(internal.integrations.contentPlatforms.getConnectionTokenForProvider, { userId, provider: library });
  if (!connection || connection.status !== "active" || !connection.accessToken) return null;
  const fresh = !connection.accessTokenExpiresAt || connection.accessTokenExpiresAt - RENEW_BEFORE_MS > Date.now();
  if (fresh) return connection.accessToken;
  if (!connection.refreshToken || !connection.oauthClientId) {
    await signedOut(ctx, connection, library);
    return null;
  }

  try {
    const tokens = await refreshDesignLibraryTokens(ctx, library, { clientId: connection.oauthClientId, refreshToken: connection.refreshToken });
    const encrypted = await encryptSecret(JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
    await ctx.runMutation(internal.integrations.contentPlatforms.storeRenewedTokens, {
      connectionId: connection.connectionId,
      version: connection.version,
      encryptedTokenPayload: encrypted.encryptedValue,
      encryptionIv: encrypted.encryptionIv,
      accessTokenExpiresAt: tokens.expiresAt,
    });
    return tokens.accessToken;
  } catch (error) {
    // Only a rejected login needs a new sign-in; a network hiccup or a server error keeps it for the next try.
    if (error instanceof SignInRejectedError) await signedOut(ctx, connection, library);
    return null;
  }
}

export type LibrarySearch =
  | ({ library: "mobbin" } & MobbinSearch)
  | { library: "refero"; query: string; platform: "web" | "ios" }
  | { library: "details"; query: string };

async function searchWith(ctx: Ctx, search: LibrarySearch, token: string) {
  if (search.library === "details") return searchDetailsInspirations(ctx, token, search.query);
  if (search.library === "refero") return searchReferoScreens(ctx, token, search.query, search.platform);
  return searchMobbin(ctx, token, search);
}

/**
 * Searches the library with the user's own account (Refero: Stage's shared key during the grace period).
 * LibraryUnavailableError when it can't be used; a login the library rejects is marked "connect again".
 */
export async function searchDesignLibrary(ctx: Ctx, userId: Id<"users">, search: LibrarySearch): Promise<LibraryScreen[]> {
  const own = await designLibraryToken(ctx, userId, search.library);
  const token = own ?? (search.library === "refero" ? await sharedReferoToken(ctx, userId) : null);
  if (!token) throw new LibraryUnavailableError(`Connect ${DESIGN_LIBRARY_MCP[search.library].label} in Stage → Integrations to search it.`);
  try {
    return await searchWith(ctx, search, token);
  } catch (error) {
    if (own && error instanceof LibraryUnavailableError && error.status === 401) {
      const connection = await ctx.runQuery(internal.integrations.contentPlatforms.getConnectionTokenForProvider, { userId, provider: search.library });
      if (connection) await signedOut(ctx, connection, search.library);
    }
    throw error;
  }
}
