import { query } from "./_generated/server";
import { requireAuthUser } from "./_helpers";

function getEnv(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export const getReferoMcpToken = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthUser(ctx);
    const token = getEnv("REFERO_MCP_TOKEN")?.trim();

    return token ? { token } : { token: null };
  },
});
