import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { validateProfile } from "../convex/lib/builderProfiles/fields";
const modules = import.meta.glob("../convex/**/*.ts");
const mine = makeFunctionReference<"query">("builderProfiles:mine");
const byHandle = makeFunctionReference<"query">("builderProfiles:byHandle");
const save = makeFunctionReference<"mutation">("builderProfiles:save");
const setSaved = makeFunctionReference<"mutation">("builderProfiles:setSaved");
const input = {
  name: "Test builder",
  handle: "test_builder",
  bio: "",
  location: "",
  roles: [],
  technologies: [],
  banner: "banner-4",
  github: "",
  x: "",
  instagram: "",
  linkedin: "",
  website: "",
  email: "",
  published: false,
};
async function setup() {
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      email: "private@example.com",
      name: "Private name",
    }),
  );
  return { t, id, user: t.withIdentity({ subject: `${id}|test_session` }) };
}
describe("builder profiles", () => {
  test("requires authentication for writes and keeps private profiles hidden", async () => {
    const { t, user } = await setup();
    await expect(t.mutation(save, input)).rejects.toThrow(/authenticated/i);
    await user.mutation(save, input);
    expect(await t.query(byHandle, { handle: input.handle })).toBeNull();
    expect(await t.query(mine, {})).toBeNull();
    expect((await user.query(mine, {})).name).toBe(input.name);
  });
  test("publishes only explicit fields, can unpublish, and reserves usernames case-insensitively", async () => {
    const { t, user } = await setup();
    await user.mutation(save, { ...input, published: true });
    const result = await t.query(byHandle, { handle: "TEST_BUILDER" });
    expect(result.name).toBe(input.name);
    expect(result).not.toHaveProperty("userId");
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    const secondId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const second = t.withIdentity({ subject: `${secondId}|session` });
    await expect(
      second.mutation(save, { ...input, handle: "TEST_BUILDER" }),
    ).rejects.toThrow(/taken/);
    await user.mutation(save, input);
    expect(await t.query(byHandle, { handle: input.handle })).toBeNull();
  });
  test("saves idempotently, isolates owners, preserves saves when editing and rejects unknown resources", async () => {
    const { t, user } = await setup();
    await user.mutation(save, input);
    const itemId = "skills/taste";
    await user.mutation(setSaved, { itemId, saved: true });
    await user.mutation(setSaved, { itemId, saved: true });
    await user.mutation(save, { ...input, bio: "Updated" });
    expect((await user.query(mine, {})).items).toEqual([itemId]);
    await expect(
      user.mutation(setSaved, { itemId: "unknown/resource", saved: true }),
    ).rejects.toThrow(/marketplace/);
    const otherId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Other" }),
    );
    const other = t.withIdentity({ subject: `${otherId}|session` });
    await other.mutation(save, { ...input, handle: "other" });
    await other.mutation(setSaved, { itemId, saved: false });
    expect((await user.query(mine, {})).items).toEqual([itemId]);
    expect((await other.query(mine, {})).items).toEqual([]);
    await user.mutation(setSaved, { itemId, saved: false });
    expect((await user.query(mine, {})).items).toEqual([]);
  });
  test("rejects unsafe links, invalid handles and oversized fields", () => {
    expect(() =>
      validateProfile({ ...input, website: "javascript:alert(1)" }),
    ).toThrow();
    expect(() => validateProfile({ ...input, handle: "../admin" })).toThrow();
    expect(() => validateProfile({ ...input, bio: "x".repeat(221) })).toThrow();
    expect(() =>
      validateProfile({
        ...input,
        website: "https://user:password@example.com",
      }),
    ).toThrow();
  });
});
