import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type UserDoc = Doc<"users">;
type UserEmailLookupCtx = {
  db: Pick<QueryCtx["db"], "query">;
};

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export function buildNameFromEmail(email: string) {
  const [localPart] = normalizeEmailAddress(email).split("@");
  if (!localPart) {
    return "Stage User";
  }

  const parts = localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));

  return parts.length > 0 ? parts.join(" ") : "Stage User";
}

function getCanonicalCreatedAt(user: UserDoc) {
  return typeof user.createdAt === "number" ? user.createdAt : Number.POSITIVE_INFINITY;
}

function hasVerifiedEmail(user: UserDoc) {
  return typeof user.emailVerificationTime === "number";
}

export function selectCanonicalUserForEmail(users: UserDoc[]) {
  if (users.length === 0) {
    return null;
  }

  return [...users].sort((left, right) => {
    if (hasVerifiedEmail(left) !== hasVerifiedEmail(right)) {
      return hasVerifiedEmail(left) ? -1 : 1;
    }

    const createdAtDifference = getCanonicalCreatedAt(left) - getCanonicalCreatedAt(right);
    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return String(left._id).localeCompare(String(right._id));
  })[0]!;
}

export async function listUsersByEmail(
  ctx: UserEmailLookupCtx,
  email: string,
) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) {
    return [];
  }

  const lookupValues = new Set<string>([normalizedEmail]);
  const trimmedEmail = email.trim();
  if (trimmedEmail && trimmedEmail !== normalizedEmail) {
    lookupValues.add(trimmedEmail);
  }

  const matches = new Map<string, UserDoc>();

  for (const lookupEmail of lookupValues) {
    const users = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", lookupEmail))
      .collect();

    for (const user of users) {
      if (
        typeof user.email === "string" &&
        normalizeEmailAddress(user.email) === normalizedEmail
      ) {
        matches.set(String(user._id), user);
      }
    }
  }

  if (matches.size === 0) {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (
        typeof user.email === "string" &&
        normalizeEmailAddress(user.email) === normalizedEmail
      ) {
        matches.set(String(user._id), user);
      }
    }
  }

  return Array.from(matches.values());
}

export async function getCanonicalUserByEmail(
  ctx: UserEmailLookupCtx,
  email: string,
) {
  return selectCanonicalUserForEmail(await listUsersByEmail(ctx, email));
}
