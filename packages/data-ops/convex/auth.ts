import Google from "@auth/core/providers/google";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import {
  convexAuth,
  createAccount,
  retrieveAccount,
  type GenericActionCtxWithAuthConfig,
} from "@convex-dev/auth/server";
import type { Value } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { LoopsOTP } from "./integrations/loopsOtp";
import { getHostnameFromUrl, isDemoAuthEnabledForHostname } from "../src/shared/demoAuth";
import { buildNameFromEmail, getCanonicalUserByEmail, normalizeEmailAddress } from "./userEmails";

function now() {
  return Date.now();
}

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function getSiteUrl() {
  return (getEnv("SITE_URL") ?? getEnv("CONVEX_SITE_URL") ?? "").replace(/\/$/, "");
}

function getAllowedSiteUrls() {
  const fromEnv = [
    getEnv("SITE_URL"),
    getEnv("STAGE_TESTING_SITE_URL"),
    ...(getEnv("STAGE_ALLOWED_SITE_URLS")?.split(",") ?? []),
  ];
  const defaults = [
    "https://getstage.co",
    "https://www.getstage.co",
    "https://testing.getstage.co",
    "https://stage.getstage.co",
  ];

  const merged = [...fromEnv, ...defaults].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return [...new Set(merged.map((value) => value.trim().replace(/\/$/, "")))];
}

function isSameSiteRedirect(siteUrl: string, redirectTo: string) {
  if (!redirectTo.startsWith(siteUrl)) {
    return false;
  }

  const nextChar = redirectTo[siteUrl.length];
  return nextChar === undefined || nextChar === "/" || nextChar === "?";
}

function isDesktopAuthRedirectPath(redirectTo: string) {
  try {
    const pathname = redirectTo.startsWith("/")
      ? new URL(redirectTo, "https://stage.invalid").pathname
      : new URL(redirectTo).pathname;
    return pathname === "/auth/desktop";
  } catch {
    return false;
  }
}

async function redirectAfterSignIn({ redirectTo }: { redirectTo: string }) {
  const allowedSiteUrls = getAllowedSiteUrls();
  const primarySiteUrl = getSiteUrl() || allowedSiteUrls[0] || "";

  if (isDesktopAuthRedirectPath(redirectTo)) {
    if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
      return primarySiteUrl ? `${primarySiteUrl}${redirectTo}` : redirectTo;
    }

    if (allowedSiteUrls.some((siteUrl) => isSameSiteRedirect(siteUrl, redirectTo))) {
      return redirectTo;
    }
  }

  if (!primarySiteUrl) {
    return redirectTo.startsWith("/") || redirectTo.startsWith("?") ? redirectTo : "/dashboard";
  }

  if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
    return `${primarySiteUrl}${redirectTo}`;
  }

  if (allowedSiteUrls.some((siteUrl) => isSameSiteRedirect(siteUrl, redirectTo))) {
    return redirectTo;
  }

  return `${primarySiteUrl}/dashboard`;
}

function isDemoAuthEnabled() {
  const explicitSetting = getEnv("ENABLE_DEMO_AUTH");
  if (explicitSetting !== undefined) {
    return explicitSetting === "true";
  }

  const siteHostname =
    getHostnameFromUrl(getEnv("SITE_URL")) ?? getHostnameFromUrl(getEnv("CONVEX_SITE_URL"));
  return isDemoAuthEnabledForHostname(siteHostname);
}

function getSiteHostname() {
  return getHostnameFromUrl(getEnv("SITE_URL")) ?? getHostnameFromUrl(getEnv("CONVEX_SITE_URL"));
}

function getNormalizedEmailAllowlist(name: string) {
  const raw = getEnv(name);
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => normalizeEmailAddress(value))
      .filter(Boolean),
  );
}

function shouldGrantReviewerPro(normalizedEmail?: string) {
  const siteHostname = getSiteHostname();
  if (siteHostname !== "testing.getstage.co") {
    return false;
  }

  if (getEnv("ENABLE_TESTING_DEFAULT_PRO") === "true") {
    return true;
  }

  if (!normalizedEmail) {
    return false;
  }

  return getNormalizedEmailAllowlist("TESTING_PRO_EMAIL_ALLOWLIST").has(normalizedEmail);
}

type AuthProfile = {
  email?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  name?: string;
  image?: string;
  avatarUrl?: string;
  role?: Doc<"users">["role"];
  plan?: Doc<"users">["plan"];
  createdAt?: number;
};

function getOptionalTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getOptionalNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function getOptionalRole(value: unknown): Doc<"users">["role"] {
  switch (value) {
    case "freelancer":
    case "studio":
    case "in-house":
    case "agency":
      return value;
    default:
      return undefined;
  }
}

function getOptionalPlan(value: unknown): Doc<"users">["plan"] {
  switch (value) {
    case "free":
    case "pro":
      return value;
    default:
      return undefined;
  }
}

function getAuthProfile(profile: Record<string, unknown>): AuthProfile {
  return {
    email: getOptionalTrimmedString(profile.email),
    phone: getOptionalTrimmedString(profile.phone),
    emailVerified: typeof profile.emailVerified === "boolean" ? profile.emailVerified : undefined,
    phoneVerified: typeof profile.phoneVerified === "boolean" ? profile.phoneVerified : undefined,
    name: getOptionalTrimmedString(profile.name),
    image: getOptionalTrimmedString(profile.image),
    avatarUrl: getOptionalTrimmedString(profile.avatarUrl),
    role: getOptionalRole(profile.role),
    plan: getOptionalPlan(profile.plan),
    createdAt: getOptionalNumber(profile.createdAt),
  };
}

function shouldTreatEmailAsVerified(args: {
  provider: { type?: string; allowDangerousEmailAccountLinking?: boolean };
  profile: AuthProfile;
}) {
  return (
    args.profile.emailVerified ??
    ((args.provider.type === "oauth" || args.provider.type === "oidc") &&
      args.provider.allowDangerousEmailAccountLinking !== false)
  );
}

function buildUserMutationData(args: {
  profile: AuthProfile;
  normalizedEmail?: string;
  emailVerified: boolean;
  timestamp: number;
}) {
  const data: Record<string, Value> = {
    updatedAt: args.timestamp,
  };

  if (args.normalizedEmail) {
    data.email = args.normalizedEmail;
  }

  if (args.profile.phone) {
    data.phone = args.profile.phone;
  }

  if (args.profile.name) {
    data.name = args.profile.name;
  }

  if (args.profile.image) {
    data.image = args.profile.image;
  }

  if (args.profile.avatarUrl) {
    data.avatarUrl = args.profile.avatarUrl;
  }

  if (args.profile.role) {
    data.role = args.profile.role;
  }

  if (args.profile.plan) {
    data.plan = args.profile.plan;
  }

  if (args.profile.createdAt !== undefined) {
    data.createdAt = args.profile.createdAt;
  }

  if (args.emailVerified) {
    data.emailVerificationTime = args.timestamp;
  }

  if (args.profile.phoneVerified) {
    data.phoneVerificationTime = args.timestamp;
  }

  return data;
}

function applyUserDefaults(args: {
  data: Record<string, Value>;
  existingUser: Doc<"users"> | null;
  normalizedEmail?: string;
  profile: AuthProfile;
  timestamp: number;
}) {
  const nextData = { ...args.data };
  const reviewerProEnabled = shouldGrantReviewerPro(args.normalizedEmail);

  if (args.existingUser?.createdAt === undefined && nextData.createdAt === undefined) {
    nextData.createdAt = args.timestamp;
  }

  if (args.existingUser?.role === undefined && nextData.role === undefined) {
    nextData.role = "freelancer";
  }

  if (reviewerProEnabled) {
    nextData.plan = "pro";
  }

  if (args.existingUser?.plan === undefined && nextData.plan === undefined) {
    nextData.plan = "free";
  }

  const fallbackName = args.normalizedEmail
    ? buildNameFromEmail(args.normalizedEmail)
    : "Stage User";
  const hasExistingName =
    typeof args.existingUser?.name === "string" && args.existingUser.name.trim().length > 0;
  const hasNextName = typeof nextData.name === "string" && nextData.name.trim().length > 0;

  if (!hasExistingName && !hasNextName) {
    nextData.name = fallbackName;
  }

  const providerAvatarUrl = args.profile.avatarUrl ?? args.profile.image;
  if (!args.existingUser?.avatarUrl && providerAvatarUrl && nextData.avatarUrl === undefined) {
    nextData.avatarUrl = providerAvatarUrl;
  }

  return nextData;
}

const DEMO_PROVIDER_ID = "demo";
const DEMO_AUTH_ENABLED = isDemoAuthEnabled();
const DEMO_EMAIL = (getEnv("DEMO_EMAIL") ?? "demo@getstage.co").trim().toLowerCase();
const DEMO_NAME = (getEnv("DEMO_NAME") ?? "Stage Demo").trim();
const DEMO_CURRENCY = (getEnv("DEMO_CURRENCY") ?? "USD").trim().toUpperCase();

const Demo = ConvexCredentials({
  id: DEMO_PROVIDER_ID,
  authorize: async (
    _params: Partial<Record<string, Value | undefined>>,
    ctx: GenericActionCtxWithAuthConfig<any>,
  ) => {
    let existing = await retrieveAccount(ctx, {
      provider: DEMO_PROVIDER_ID,
      account: { id: DEMO_EMAIL },
    }).catch(() => null);

    if (!existing) {
      existing = await createAccount(ctx, {
        provider: DEMO_PROVIDER_ID,
        account: { id: DEMO_EMAIL },
        profile: {
          email: DEMO_EMAIL,
          name: DEMO_NAME,
          role: "freelancer",
          plan: "pro",
          createdAt: now(),
          updatedAt: now(),
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
    }

    await ctx.runMutation(internal.domain.demo.workspace.resetAndSeedDemoWorkspace, {
      userId: existing.user._id,
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      currency: DEMO_CURRENCY,
    });

    return { userId: existing.user._id };
  },
});

// Stopgap until the desktop refresh-token retry flow ships:
// give the JWT a 30-day lifetime so desktop sessions do not expire after 1 hour.
// Tracked in docs/archive/session-plans/05-10/05-10-token-refresh-and-tasks-priority-plan.md.
const DESKTOP_JWT_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: DEMO_AUTH_ENABLED ? [Google, LoopsOTP, Demo] : [Google, LoopsOTP],
  jwt: {
    durationMs: DESKTOP_JWT_DURATION_MS,
  },
  callbacks: {
    redirect: redirectAfterSignIn,
    async createOrUpdateUser(ctx, { existingUserId, profile, provider }) {
      const timestamp = now();
      const normalizedProfile = getAuthProfile(profile);
      const normalizedEmail = normalizedProfile.email
        ? normalizeEmailAddress(normalizedProfile.email)
        : undefined;
      const emailVerified = shouldTreatEmailAsVerified({
        provider,
        profile: normalizedProfile,
      });

      let userId = existingUserId as Id<"users"> | null;
      let user =
        userId === null
          ? normalizedEmail
            ? await getCanonicalUserByEmail(ctx, normalizedEmail)
            : null
          : await ctx.db.get(userId);

      if (userId !== null && !user) {
        throw new Error(
          `Could not update user document with ID \`${userId}\`, either the user has been deleted but their account has not, or the linked auth account is invalid.`,
        );
      }

      if (userId === null && user) {
        userId = user._id;
      }

      const userData = applyUserDefaults({
        data: buildUserMutationData({
          profile: normalizedProfile,
          normalizedEmail,
          emailVerified,
          timestamp,
        }),
        existingUser: user,
        normalizedEmail,
        profile: normalizedProfile,
        timestamp,
      });

      const isNewUser = userId === null && !user;

      if (userId !== null) {
        await ctx.db.patch(userId, userData);
      } else {
        userId = await ctx.db.insert("users", userData);
      }

      if (isNewUser && normalizedEmail) {
        const fullName = (userData.name as string | undefined) ?? "";
        const nameParts = fullName.split(" ");
        await ctx.scheduler.runAfter(0, internal.integrations.resendAudience.syncContactToResend, {
          email: normalizedEmail,
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(" ") || undefined,
        });
      }

      return userId;
    },
  },
});
