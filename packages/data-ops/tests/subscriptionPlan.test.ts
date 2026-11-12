import { afterEach, beforeEach, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const sync = makeFunctionReference<"mutation">("billing:syncSubscriptionMirror");
const SOLO = "price_solo_monthly";

beforeEach(() => { process.env.STRIPE_SOLO_MONTHLY_PRICE_ID = SOLO; });
afterEach(() => { delete process.env.STRIPE_SOLO_MONTHLY_PRICE_ID; });

const syncArgs = (userId: unknown, stripeSubscriptionId: string, stripeStatus: string) =>
  ({ userId, stripeSubscriptionId, stripeCustomerId: "cus_1", stripePriceId: SOLO, stripeStatus, currentPeriodEndMs: 1, cancelAtPeriodEnd: false });

test("syncing a cancelled subscription never brings the plan back; a live one keeps it", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: "Owner", plan: "start" }));

  await t.mutation(sync, syncArgs(userId, "sub_old", "canceled"));
  expect((await t.run((ctx) => ctx.db.get(userId)))?.plan).toBe("free");

  await t.mutation(sync, syncArgs(userId, "sub_new", "trialing"));
  await t.mutation(sync, syncArgs(userId, "sub_old", "canceled"));
  expect((await t.run((ctx) => ctx.db.get(userId)))?.plan).toBe("start");
});
