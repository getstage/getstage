import { beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

// PR #81 seat rules (STA-43 security checks). The owner's seats come from the
// Stripe subscription; replace that lookup so plan changes can be simulated.
const subscription = vi.hoisted(() => ({ seats: 5 as number | null }));
vi.mock("../convex/billing", () => ({
  getCurrentSubscriptionSnapshot: async () => (subscription.seats === null ? null : { seats: subscription.seats }),
}));
const { listOverLimitMemberIds, listActiveMembershipsForUser } = await import(
  "../convex/helpers/access/seatEntitlement"
);

const modules = import.meta.glob("../convex/**/*.ts");

async function workspace(memberCount: number) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Owner" });
    const members: Array<{ userId: Id<"users">; membershipId: Id<"projectCollaborators"> }> = [];
    for (let index = 0; index < memberCount; index += 1) {
      const userId = await ctx.db.insert("users", { name: `Member ${index + 1}` });
      const membershipId = await ctx.db.insert("projectCollaborators", {
        ownerUserId: owner, userId, role: "editor", addedBy: owner, createdAt: index,
      });
      members.push({ userId, membershipId });
    }
    return { owner, members };
  });
  const overLimit = async () => new Set(await t.run(async (ctx) => [...(await listOverLimitMemberIds(ctx, ids.owner))]));
  return { t, ...ids, overLimit };
}

beforeEach(() => {
  subscription.seats = 5;
});

describe("seat entitlement after plan changes", () => {
  test("Studio (5 seats): owner plus 4 members keep access, the 5th member is over the limit", async () => {
    const { members, overLimit } = await workspace(5);
    expect([...(await overLimit())]).toEqual([members[4]!.membershipId]);
  });

  test("Studio → Solo with members: every member loses access, rows are kept", async () => {
    const { t, members, overLimit } = await workspace(3);
    subscription.seats = 1;
    expect((await overLimit()).size).toBe(3);
    const active = await t.run((ctx) => listActiveMembershipsForUser(ctx, members[0]!.userId));
    expect(active).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query("projectCollaborators").collect())).toHaveLength(3);
  });

  test("Agency → Studio over capacity: the earliest-joined members keep their seats", async () => {
    const { members, overLimit } = await workspace(8);
    subscription.seats = 5;
    const blocked = await overLimit();
    expect(members.slice(0, 4).every((member) => !blocked.has(member.membershipId))).toBe(true);
    expect(members.slice(4).every((member) => blocked.has(member.membershipId))).toBe(true);
  });

  test("no active subscription counts as one seat", async () => {
    const { overLimit } = await workspace(2);
    subscription.seats = null;
    expect((await overLimit()).size).toBe(2);
  });

  test("re-upgrading restores access", async () => {
    const { t, members, overLimit } = await workspace(3);
    subscription.seats = 1;
    expect((await overLimit()).size).toBe(3);
    subscription.seats = 15;
    expect((await overLimit()).size).toBe(0);
    const active = await t.run((ctx) => listActiveMembershipsForUser(ctx, members[2]!.userId));
    expect(active).toHaveLength(1);
  });
});
