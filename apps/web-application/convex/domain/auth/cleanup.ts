import { internalMutation } from "../../_generated/server";

function now() {
  return Date.now();
}

export const pruneExpiredAuthRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const currentTime = now();

    const expiredSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.lt(q.field("expirationTime"), currentTime))
      .collect();
    const expiredSessionIds = new Set(expiredSessions.map((session) => session._id));

    const refreshTokens = await ctx.db.query("authRefreshTokens").collect();
    const refreshTokenIdsToDelete = refreshTokens
      .filter(
        (refreshToken) =>
          refreshToken.expirationTime < currentTime ||
          expiredSessionIds.has(refreshToken.sessionId),
      )
      .map((refreshToken) => refreshToken._id);

    const verificationCodes = await ctx.db.query("authVerificationCodes").collect();
    const verificationCodeIdsToDelete = verificationCodes
      .filter((verificationCode) => verificationCode.expirationTime < currentTime)
      .map((verificationCode) => verificationCode._id);

    const verifiers = await ctx.db.query("authVerifiers").collect();
    const verifierIdsToDelete = verifiers
      .filter(
        (verifier) =>
          verifier.sessionId !== undefined && expiredSessionIds.has(verifier.sessionId),
      )
      .map((verifier) => verifier._id);

    for (const refreshTokenId of refreshTokenIdsToDelete) {
      await ctx.db.delete(refreshTokenId);
    }

    for (const verifierId of verifierIdsToDelete) {
      await ctx.db.delete(verifierId);
    }

    for (const verificationCodeId of verificationCodeIdsToDelete) {
      await ctx.db.delete(verificationCodeId);
    }

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    return {
      deletedSessions: expiredSessions.length,
      deletedRefreshTokens: refreshTokenIdsToDelete.length,
      deletedVerificationCodes: verificationCodeIdsToDelete.length,
      deletedVerifiers: verifierIdsToDelete.length,
      ranAt: currentTime,
    };
  },
});
