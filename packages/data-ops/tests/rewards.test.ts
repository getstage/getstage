import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { xPostId } from "../convex/lib/rewards/handlers";

const modules = import.meta.glob("../convex/**/*.ts");
const claim = makeFunctionReference<"action">("rewards:claimXShareReward");
const reserve = makeFunctionReference<"mutation">("rewards:reserveClaim");
const complete = makeFunctionReference<"mutation">("rewards:completeClaim");
const myClaim = makeFunctionReference<"query">("rewards:myRewardClaim");
const post = "https://x.com/builder/status/1840000000000000001";

async function setup({ published = true } = {}) {
  const t = convexTest(schema, modules);
  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", { name: "Builder", email: "builder@example.com" });
    await ctx.db.insert("builderProfiles", {
      name: "Builder", handle: "builder", bio: "", location: "", roles: [], technologies: [], banner: "banner-4",
      github: "", x: "", instagram: "", linkedin: "", website: "", email: "", published, userId: id, items: [],
      updatedAt: 0,
    });
    return id;
  });
  return { t, user: t.withIdentity({ subject: `${userId}|session` }) };
}

afterEach(() => vi.unstubAllGlobals());

describe("share on X reward", () => {
  test("accepts only X post URLs", () => {
    expect(xPostId(post)).toBe("1840000000000000001");
    expect(xPostId("https://twitter.com/builder/status/42?s=20")).toBe("42");
    expect(xPostId("https://x.com/builder")).toBeNull();
    expect(xPostId("https://instagram.com/p/abc")).toBeNull();
    expect(xPostId("http://x.com/builder/status/42")).toBeNull();
  });

  test("requires sign-in and a published profile", async () => {
    const { t } = await setup();
    await expect(t.mutation(reserve, { postId: "1", postUrl: post })).rejects.toThrow(/authenticated/i);
    const { user } = await setup({ published: false });
    expect(await user.action(claim, { postUrl: post })).toEqual({ status: "unpublished" });
    expect(await user.action(claim, { postUrl: "https://x.com/builder" })).toEqual({ status: "invalid" });
  });

  test("one reward per user and per post", async () => {
    const { t, user } = await setup();
    const first = await user.mutation(reserve, { postId: "1", postUrl: post });
    expect(first.kind).toBe("reserved");
    expect(await user.mutation(reserve, { postId: "2", postUrl: post })).toEqual({ kind: "busy" });
    expect(await user.query(myClaim, {})).toBeNull();

    await user.mutation(complete, { claimId: first.claimId, code: "STG-AAAA-BBBB-CCCC", promotionCodeId: "promo_1" });
    expect(await user.query(myClaim, {})).toEqual({ code: "STG-AAAA-BBBB-CCCC" });
    expect(await user.mutation(reserve, { postId: "2", postUrl: post })).toEqual({ kind: "existing", code: "STG-AAAA-BBBB-CCCC" });

    const otherId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { name: "Other" });
      await ctx.db.insert("builderProfiles", {
        name: "Other", handle: "other", bio: "", location: "", roles: [], technologies: [], banner: "banner-4",
        github: "", x: "", instagram: "", linkedin: "", website: "", email: "", published: true, userId: id, items: [],
        updatedAt: 0,
      });
      return id;
    });
    const other = t.withIdentity({ subject: `${otherId}|session` });
    expect(await other.mutation(reserve, { postId: "1", postUrl: post })).toEqual({ kind: "claimed" });
  });

  test("a post without the profile link is refused and frees the reservation", async () => {
    const { user } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ html: "<blockquote>My stack, no link</blockquote>" })));
    expect(await user.action(claim, { postUrl: post })).toEqual({ status: "unrelated" });
    expect((await user.mutation(reserve, { postId: "9", postUrl: post })).kind).toBe("reserved");
  });

  test("an unreadable post is reported as unavailable", async () => {
    const { user } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    expect(await user.action(claim, { postUrl: post })).toEqual({ status: "unavailable" });
  });
});
