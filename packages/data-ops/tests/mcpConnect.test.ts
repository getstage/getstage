import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import stripeSchema from "../node_modules/@convex-dev/stripe/dist/component/schema.js";
import { generateRawKey, hashKey, planAllowsKey } from "../convex/developer/apiKeys";

const modules = import.meta.glob("../convex/**/*.ts");
const stripeModules = import.meta.glob("../node_modules/@convex-dev/stripe/dist/component/**/*.js");

function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("stripe", stripeSchema, stripeModules);
  return t;
}

const redeem = makeFunctionReference<"mutation">("developer/mcpConnect:redeemConnectCode");
const authenticate = makeFunctionReference<"mutation">("developer/apiKeys:authenticateByHashedKey");
const create = makeFunctionReference<"mutation">("developer/mcpConnect:createConnectCode");
const verifier = "v".repeat(43);

async function challenge(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function issueCode(t: ReturnType<typeof convexTest>) {
  const code = generateRawKey();
  const codeChallenge = await challenge(verifier);
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Tester", plan: "pro" });
    await ctx.db.insert("mcpConnectCodes", { userId: id, hashedCode: await hashKey(code), codeChallenge, clientName: "Claude", workspaceIds: [id], access: "read", expiresAt: Date.now() + 60_000 });
    return id;
  });
  return { code, userId };
}

describe("connecting an AI tool over MCP", () => {
  test("a code works once, only with the matching verifier", async () => {
    const t = setup();
    const wrong = await issueCode(t);
    expect(await t.mutation(redeem, { code: wrong.code, verifier: "w".repeat(43) })).toEqual({ ok: false });
    expect(await t.mutation(redeem, { code: wrong.code, verifier })).toEqual({ ok: false });

    const { code, userId } = await issueCode(t);
    expect(await t.mutation(redeem, { code, verifier })).toMatchObject({ ok: true, userId: String(userId) });
    expect(await t.mutation(redeem, { code, verifier })).toEqual({ ok: false });
    const keys = await t.run((ctx) => ctx.db.query("apiKeys").collect());
    expect(keys).toEqual([expect.objectContaining({ kind: "mcp", name: "MCP · Claude", mcpWorkspaceIds: [userId], mcpAccess: "read" })]);
  });

  test("the key carries the chosen scope; a key without one is refused", async () => {
    const t = setup();
    const { code, userId } = await issueCode(t);
    const result = await t.mutation(redeem, { code, verifier });
    if (!result.ok) throw new Error("redeem failed");
    const hashedKey = await hashKey(result.apiKey);
    expect(await t.mutation(authenticate, { hashedKey })).toMatchObject({ mcp: { access: "read", workspaceIds: [userId] } });

    await t.run((ctx) => ctx.db.insert("apiKeys", { userId, hashedKey: "unscoped", name: "MCP · Old", kind: "mcp", createdAt: Date.now() }));
    expect(await t.mutation(authenticate, { hashedKey: "unscoped" })).toBeNull();
  });

  test("a connect code only covers workspaces the user belongs to", async () => {
    const t = setup();
    const [userId, otherId] = await t.run(async (ctx) => [
      await ctx.db.insert("users", { name: "Tester", plan: "pro" }),
      await ctx.db.insert("users", { name: "Other", plan: "pro" }),
    ]);
    const asUser = t.withIdentity({ subject: `${userId}|session` });
    const args = { codeChallenge: await challenge(verifier), clientName: "Claude", access: "write" as const };
    await expect(asUser.mutation(create, { ...args, workspaceIds: [String(otherId)] })).rejects.toThrow("don't have access");
    await expect(asUser.mutation(create, { ...args, workspaceIds: [] })).rejects.toThrow("at least one workspace");
    await expect(asUser.mutation(create, { ...args, workspaceIds: [String(userId)] })).resolves.toHaveProperty("code");
  });

  test("MCP keys need Studio or Agency; developer API keys need Studio", () => {
    expect((["free", "start", "pro", "team"] as const).filter((plan) => planAllowsKey("mcp", plan))).toEqual(["pro", "team"]);
    expect((["free", "start", "pro", "team"] as const).filter((plan) => planAllowsKey("api", plan))).toEqual(["pro"]);
  });
});
