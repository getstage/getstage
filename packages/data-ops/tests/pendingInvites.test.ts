import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const takePendingEmails = makeFunctionReference<"mutation">("domain/collaborators/invites:takePendingEmails");

test("teammates from setup are handed out once, so a repeated Stripe webhook never invites twice", async () => {
  const t = convexTest(schema, modules);
  const ownerUserId = await t.run((ctx) => ctx.db.insert("users", { name: "Owner", pendingInviteEmails: ["a@example.com", "b@example.com"] }));
  expect(await t.mutation(takePendingEmails, { ownerUserId })).toEqual(["a@example.com", "b@example.com"]);
  expect(await t.mutation(takePendingEmails, { ownerUserId })).toEqual([]);
});
