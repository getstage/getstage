import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { generateRawKey, hashKey, planAllowsKey } from "../convex/developer/apiKeys";

const modules = import.meta.glob("../convex/**/*.ts");
const redeem = makeFunctionReference<"mutation">("developer/mcpConnect:redeemConnectCode");
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
    await ctx.db.insert("mcpConnectCodes", { userId: id, hashedCode: await hashKey(code), codeChallenge, clientName: "Claude", expiresAt: Date.now() + 60_000 });
    return id;
  });
  return { code, userId };
}

describe("connecting an AI tool over MCP", () => {
  test("a code works once, only with the matching verifier", async () => {
    const t = convexTest(schema, modules);
    const wrong = await issueCode(t);
    expect(await t.mutation(redeem, { code: wrong.code, verifier: "w".repeat(43) })).toEqual({ ok: false });
    expect(await t.mutation(redeem, { code: wrong.code, verifier })).toEqual({ ok: false });

    const { code, userId } = await issueCode(t);
    expect(await t.mutation(redeem, { code, verifier })).toMatchObject({ ok: true, userId: String(userId) });
    expect(await t.mutation(redeem, { code, verifier })).toEqual({ ok: false });
    const keys = await t.run((ctx) => ctx.db.query("apiKeys").collect());
    expect(keys).toEqual([expect.objectContaining({ kind: "mcp", name: "MCP · Claude" })]);
  });

  test("MCP keys need Studio or Agency; developer API keys need Studio", () => {
    expect((["free", "start", "pro", "team"] as const).filter((plan) => planAllowsKey("mcp", plan))).toEqual(["pro", "team"]);
    expect((["free", "start", "pro", "team"] as const).filter((plan) => planAllowsKey("api", plan))).toEqual(["pro"]);
  });
});
