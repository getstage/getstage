import type { Context } from "hono";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

export type ApiBindings = ActionCtx;

export type ApiContext = Context<{
  Bindings: ApiBindings;
}>;

export type McpScope = {
  access: "read" | "write";
  workspaceIds: Id<"users">[];
};

export type ApiAuthContext = {
  apiKeyId?: Id<"apiKeys">;
  userId: Id<"users">;
  mcp?: McpScope;
};
