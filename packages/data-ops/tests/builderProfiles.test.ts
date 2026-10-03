import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";
import { marketplaceIds } from "../convex/lib/builderProfiles/catalog";
import websiteCatalog from "../../../apps/web-application/src/marketing/marketplace/catalog.json";
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
  test("signed-in builders can save directly before setting up a profile", async () => {
    const {t,user}=await setup();
    await user.mutation(setSaved,{itemId:"skills/taste",saved:true});
    await user.mutation(setSaved,{itemId:"skills/taste",saved:true});
    const profile=await user.query(mine,{});
    expect(profile.items).toEqual(["skills/taste"]);
    expect(profile.published).toBe(false);
    expect(await t.query(byHandle,{handle:profile.handle})).toBeNull();
    const secondId=await t.run(ctx=>ctx.db.insert("users",{name:"Private name"}));
    const second=t.withIdentity({subject:`${secondId}|session`});
    await second.mutation(setSaved,{itemId:"skills/taste",saved:true});
    expect((await second.query(mine,{})).handle).not.toBe(profile.handle);
  });
  test("round-trips every profile field across sessions and preserves collections", async () => {
    const { t, id, user } = await setup();
    const complete = {
      ...input,
      name: "Saved Builder",
      bio: "Designing and building products",
      location: "CY",
      roles: ["Designer", "Founder"],
      technologies: ["react", "typescript"],
      banner: "banner-2",
      customAvatar: "data:image/webp;base64,AAAA",
      customBanner: "data:image/webp;base64,BBBB",
      github: "https://github.com/example",
      x: "https://x.com/example",
      instagram: "https://instagram.com/example",
      linkedin: "https://linkedin.com/in/example",
      website: "https://example.com",
      email: "public@example.com",
    };
    await user.mutation(save, complete);
    await user.mutation(setSaved, { itemId: "skills/taste", saved: true });
    const anotherSession = t.withIdentity({ subject: `${id}|second_session` });
    expect(await anotherSession.query(mine, {})).toMatchObject({ ...complete, items: ["skills/taste"] });
    await anotherSession.mutation(save, { ...complete, published: true });
    expect(await t.query(byHandle, { handle: input.handle })).toMatchObject({ ...complete, published: true, items: ["skills/taste"] });
    await anotherSession.mutation(save, { ...complete, customAvatar: "", customBanner: "" });
    expect(await user.query(mine, {})).toMatchObject({ customAvatar: "", customBanner: "", items: ["skills/taste"] });
    expect(await t.query(byHandle, { handle: input.handle })).toBeNull();
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
  test("accepts only a country from the list as location", () => {
    expect(validateProfile({ ...input, location: "NL" }).location).toBe("NL");
    expect(validateProfile({ ...input, location: " CY " }).location).toBe("CY");
    expect(validateProfile({ ...input, location: "" }).location).toBe("");
    expect(() => validateProfile({ ...input, location: "Hokuspokusland" })).toThrow("Choose your country");
    expect(() => validateProfile({ ...input, location: "Netherlands" })).toThrow("Choose your country");
    expect(() => validateProfile({ ...input, location: "ZZ" })).toThrow("Choose your country");
  });
  test("setup persists each step, resumes in order and never regresses completion", async () => {
    const { user } = await setup();
    const saveStep = makeFunctionReference<"mutation">("builderProfiles:saveSetupStep");
    await expect(user.mutation(saveStep, { profile: input, step: 2, items: [] })).rejects.toThrow(/previous step/);
    await user.mutation(saveStep, { profile: input, step: 1, items: [] });
    expect((await user.query(mine, {})).onboardingStep).toBe(1);
    await user.mutation(saveStep, { profile: { ...input, roles: ["Founder"], bio: "Building" }, step: 2, items: [] });
    expect((await user.query(mine, {})).roles).toEqual(["Founder"]);
    await user.mutation(saveStep, { profile: { ...input, technologies: ["react"], github: "https://github.com/example" }, step: 3, items: ["skills/taste"] });
    const finished = await user.query(mine, {});
    expect(finished.onboardingStep).toBe(3);
    expect(finished.items).toEqual(["skills/taste"]);
    await user.mutation(save, { ...input, bio: "Edited later" });
    expect((await user.query(mine, {})).onboardingStep).toBe(3);
    expect((await user.query(mine, {})).items).toEqual(["skills/taste"]);
    await user.mutation(saveStep, { profile: input, step: 1, items: ["skills/taste"] });
    expect((await user.query(mine, {})).onboardingStep).toBe(3);
  });
  test("username availability includes private profiles and suggests a free suffix", async () => {
    const { t, user } = await setup();
    const username = makeFunctionReference<"query">("builderProfiles:username");
    await user.mutation(save, input);
    expect((await user.query(username, { handle: input.handle })).available).toBe(true);
    const id = await t.run(ctx => ctx.db.insert("users", { name: "Another builder" }));
    const other = t.withIdentity({ subject: `${id}|session` });
    const result = await other.query(username, { handle: input.handle });
    expect(result).toEqual({ available: false, suggestion: "test_builder1" });
    await expect(t.query(username, { handle: input.handle })).rejects.toThrow(/authenticated/i);
  });

});


test("website catalog and profile save validation stay aligned", () => {
  expect([...marketplaceIds].sort()).toEqual(websiteCatalog.map(item => item.id).sort());
});

test("all nine new component libraries can be saved and reloaded", async () => {
  const { user } = await setup();
  const ids = ["skiper-ui", "thinking-orbs", "liveline", "obsidian-ui", "originkit", "beautiful-ui", "aicss", "coss-ui", "componentry"].map(slug => `component-libraries/${slug}`);
  for (const itemId of ids) await user.mutation(setSaved, { itemId, saved: true });
  expect((await user.query(mine, {})).items).toEqual(ids);
});

test("Arc saves idempotently, survives a new session and appears on a published profile", async () => {
  const { t, id, user } = await setup();
  const itemId = "component-libraries/arc";
  await user.mutation(save, { ...input, published: true });
  await user.mutation(setSaved, { itemId, saved: true });
  await user.mutation(setSaved, { itemId, saved: true });
  const nextSession = t.withIdentity({ subject: `${id}|next_session` });
  expect((await nextSession.query(mine, {})).items).toEqual([itemId]);
  expect((await t.query(byHandle, { handle: input.handle })).items).toEqual([itemId]);
  await nextSession.mutation(setSaved, { itemId, saved: false });
  expect((await user.query(mine, {})).items).toEqual([]);
});

test("Arc can be selected during profile setup", async () => {
  const { user } = await setup();
  const saveStep = makeFunctionReference<"mutation">("builderProfiles:saveSetupStep");
  const items = ["component-libraries/arc"];
  await user.mutation(saveStep, { profile: input, step: 1, items });
  expect((await user.query(mine, {})).items).toEqual(items);
});
