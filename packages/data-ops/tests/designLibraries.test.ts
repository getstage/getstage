import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema";
import workflowSchema from "../node_modules/@convex-dev/workflow/dist/component/schema";
import { encryptSecret } from "../convex/lib/credentialVault";

const modules = import.meta.glob("../convex/**/*.ts");
const stripeModules = import.meta.glob("../node_modules/@convex-dev/stripe/dist/component/**/*.js");
const workflowModules = import.meta.glob("../node_modules/@convex-dev/workflow/dist/component/**/*.js");

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  t.registerComponent("workflow", workflowSchema, workflowModules);
  return t;
}

const searchGroup = makeFunctionReference<"action">("workflows/research:searchGroup");
const collected = makeFunctionReference<"mutation">("workflows/research:collected");
const appSearch = { id: "ui-patterns-pricing", title: "Pricing", source: "mobbin-screens" as const, platform: "web" as const, query: "pricing page" };

// What Mobbin's search_sections / search_screens answered in the 2026-11-26 test.
const mobbinAnswer = (kind: string) => ({
  jsonrpc: "2.0",
  id: 1,
  result: { content: [], structuredContent: { query: "x", page: 1, [kind]: [{ id: "f30de5ce", image_url: "https://mobbin.com/api/mcp/short/BxWWwjak", mobbin_url: "https://mobbin.com/sites/sections/f30de5ce", site_name: "folk" }] } },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => vi.stubEnv("APP_CREDENTIALS_SECRET", "test-secret-for-design-libraries"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function seedUser(t: ReturnType<typeof setup>, mobbin?: { expiresAt?: number; refreshToken?: string }) {
  const encrypted = await encryptSecret(JSON.stringify({ accessToken: "user-token", refreshToken: mobbin?.refreshToken ?? null }));
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Owner", plan: "pro" });
    if (mobbin) {
      await ctx.db.insert("nativeIntegrationConnections", {
        userId, provider: "mobbin", status: "active", oauthClientId: "stage-client",
        encryptedTokenPayload: encrypted.encryptedValue, encryptionIv: encrypted.encryptionIv,
        accessTokenExpiresAt: mobbin.expiresAt, createdAt: 1, updatedAt: 1,
      });
    }
    return userId;
  });
}

describe("Research with the user's own design library", () => {
  test("searches Mobbin with the user's token and reads its screens", async () => {
    const t = setup();
    const userId = await seedUser(t, {});
    const fetch = vi.fn(async () => json(mobbinAnswer("screens")));
    vi.stubGlobal("fetch", fetch);
    await expect(t.action(searchGroup, { userId, search: appSearch })).resolves.toEqual([
      { id: "f30de5ce", title: "folk", productName: "folk", sourceUrl: "https://mobbin.com/sites/sections/f30de5ce", thumbnailUrl: "https://mobbin.com/api/mcp/short/BxWWwjak" },
    ]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mobbin.com/mcp");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer user-token");
    expect(JSON.parse(String(init.body)).params).toEqual({ name: "search_screens", arguments: { query: "pricing page", platform: "web" } });
  });

  test("not connected, signed out, out of credits or over the limit: the screen type is skipped, other errors fail", async () => {
    const t = setup();
    const stranger = await seedUser(t);
    await expect(t.action(searchGroup, { userId: stranger, search: appSearch })).resolves.toBeNull();
    const userId = await seedUser(t, {});
    for (const status of [402, 429]) {
      vi.stubGlobal("fetch", vi.fn(async () => json({}, status)));
      await expect(t.action(searchGroup, { userId, search: appSearch })).resolves.toBeNull();
    }
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));
    await expect(t.action(searchGroup, { userId, search: appSearch })).rejects.toThrow("Mobbin request failed with status 500.");
    // A rejected login is skipped too, and Integrations then asks to connect again.
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 401)));
    await expect(t.action(searchGroup, { userId, search: appSearch })).resolves.toBeNull();
    const connection = await t.run((ctx) => ctx.db.query("nativeIntegrationConnections").first());
    expect(connection).toMatchObject({ status: "error", lastError: "Mobbin signed Stage out. Connect it again in Integrations." });
  });

  test("a renewal that fails for a moment keeps the login", async () => {
    const t = setup();
    const userId = await seedUser(t, { expiresAt: Date.now() - 1000, refreshToken: "refresh-1" });
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 503)));
    await expect(t.action(searchGroup, { userId, search: appSearch })).resolves.toBeNull();
    const connection = await t.run((ctx) => ctx.db.query("nativeIntegrationConnections").first());
    expect(connection?.status).toBe("active");
    expect(connection?.encryptedTokenPayload).toBeTruthy();
  });

  test("an expired login is renewed before searching", async () => {
    const t = setup();
    const userId = await seedUser(t, { expiresAt: Date.now() - 1000, refreshToken: "refresh-1" });
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.mobbin.com/.well-known/oauth-protected-resource/mcp") return json({ authorization_servers: ["https://auth.example.com/auth/v1"] });
      if (url === "https://auth.example.com/.well-known/oauth-authorization-server/auth/v1") {
        return json({ authorization_endpoint: "https://auth.example.com/authorize", token_endpoint: "https://auth.example.com/token", registration_endpoint: "https://auth.example.com/register" });
      }
      if (url === "https://auth.example.com/token") {
        expect(String(init?.body)).toContain("refresh_token=refresh-1");
        return json({ access_token: "renewed-token", expires_in: 3600 });
      }
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer renewed-token");
      return json(mobbinAnswer("screens"));
    });
    vi.stubGlobal("fetch", fetch);
    await expect(t.action(searchGroup, { userId, search: appSearch })).resolves.toHaveLength(1);
    const connection = await t.run((ctx) => ctx.db.query("nativeIntegrationConnections").first());
    expect(connection?.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });

  test("a run with no screen types searched keeps going without UI patterns", async () => {
    const t = setup();
    const runId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", plan: "pro" });
      const projectId = await ctx.db.insert("projects", { userId, name: "Test", clientName: "Client", type: "websites", status: "active", startDate: 1, endDate: 2, progress: 0, createdAt: 1, updatedAt: 1 });
      return ctx.db.insert("projectAiRuns", { userId, projectId, module: "research", title: "Research (AI tool)", status: "running", trigger: "agent", startedAt: 1, updatedAt: 1 });
    });
    await t.mutation(collected, { workflowId: "w1", result: { kind: "success", returnValue: "[]" }, context: { runId } });
    const { run, checkpoint } = await t.run(async (ctx) => ({ run: await ctx.db.get(runId), checkpoint: await ctx.db.query("projectAiRunCheckpoints").first() }));
    expect(run?.status).toBe("running");
    expect(checkpoint?.contentJson).toBe("[]");
  });
});

describe("Connecting Mobbin in Integrations", () => {
  test("the sign-in callback stores the user's login and sends them back to Integrations", async () => {
    vi.stubEnv("SITE_URL", "https://testing.getstage.co");
    const t = setup();
    const connectionId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", { name: "Owner", plan: "pro" });
      return ctx.db.insert("nativeIntegrationConnections", {
        userId, provider: "mobbin", status: "pending", oauthState: "state-1", pkceVerifier: "verifier-1", oauthClientId: "stage-client", createdAt: 1, updatedAt: 1,
      });
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("oauth-protected-resource")) return json({ authorization_servers: ["https://auth.example.com/auth/v1"] });
      if (url.includes("oauth-authorization-server")) {
        return json({ authorization_endpoint: "https://auth.example.com/authorize", token_endpoint: "https://auth.example.com/token", registration_endpoint: "https://auth.example.com/register" });
      }
      const body = new URLSearchParams(String(init?.body));
      expect(Object.fromEntries(body)).toMatchObject({ grant_type: "authorization_code", code: "code-1", client_id: "stage-client", code_verifier: "verifier-1", redirect_uri: "https://testing.getstage.co/integrations/mobbin/callback" });
      return json({ access_token: "user-token", refresh_token: "refresh-1", expires_in: 3600 });
    }));
    const response = await t.fetch("/integrations/mobbin/callback?code=code-1&state=state-1", { redirect: "manual" });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://testing.getstage.co/app/integrations?integration=mobbin&integration_status=connected");
    const connection = await t.run((ctx) => ctx.db.get(connectionId));
    expect(connection).toMatchObject({ status: "active", displayName: "Mobbin", oauthClientId: "stage-client" });
    expect(connection?.pkceVerifier).toBeUndefined();
    expect(connection?.encryptedTokenPayload).toBeTruthy();
  });
});

describe("Stage's shared Refero access (until 31 December)", () => {
  // An account from before the switch to own accounts, during the grace period.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  test("ends on 31 December", async () => {
    vi.stubEnv("REFERO_MCP_TOKEN", "stage-key");
    const t = setup();
    const userId = await seedUser(t);
    vi.setSystemTime(new Date("2027-01-01T00:00:01Z"));
    vi.stubGlobal("fetch", vi.fn(async () => json({})));
    await expect(t.action(searchGroup, { userId, search: { ...appSearch, source: "refero-screens" as const } })).resolves.toBeNull();
  });

  const referoSearch = { ...appSearch, source: "refero-screens" as const };
  const referoAnswer = { jsonrpc: "2.0", id: 1, result: { structuredContent: { records: [{ uuid: "r1", title: "Pricing", thumbnail_url: "https://images.refero.design/r1.jpg", site: { name: "Linear" } }] } } };

  test("an existing user without their own account searches Refero with Stage's key, up to the per-user limit", async () => {
    vi.stubEnv("REFERO_MCP_TOKEN", "stage-key");
    vi.stubEnv("SHARED_REFERO_LOOKUP_LIMIT", "2");
    const t = setup();
    const userId = await seedUser(t);
    const fetch = vi.fn(async () => json(referoAnswer));
    vi.stubGlobal("fetch", fetch);
    await expect(t.action(searchGroup, { userId, search: referoSearch })).resolves.toHaveLength(1);
    await expect(t.action(searchGroup, { userId, search: referoSearch })).resolves.toHaveLength(1);
    await expect(t.action(searchGroup, { userId, search: referoSearch })).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer stage-key");
    const usage = await t.run((ctx) => ctx.db.query("sharedReferoUsage").first());
    expect(usage?.lookups).toBe(2);
  });

  test("no shared access once the user connects their own Mobbin", async () => {
    vi.stubEnv("REFERO_MCP_TOKEN", "stage-key");
    const t = setup();
    const userId = await seedUser(t, {});
    vi.stubGlobal("fetch", vi.fn(async () => json(referoAnswer)));
    await expect(t.action(searchGroup, { userId, search: referoSearch })).resolves.toBeNull();
  });
});
