import { useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery } from "convex/react";
import { PageLoading } from "@/components/shared/PageLoading";
import { Paywall } from "@/components/setup/Paywall";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/convex";
import { getMcpOrigin, hasMcpPlan } from "@/lib/mcp";
import stageLogo from "@/assets/logos/stage-logo-light.png";
import { ALL_MCP_PERMISSIONS, MCP_PERMISSIONS, mcpPermissionLabel, withNeeded, withoutDependents, type McpPermission } from "@stage/data-ops/domain/mcpPermissions";

type ConnectRequest = { state: string; challenge: string; client: string; domain?: string; redirectHost: string; local: boolean };

export const Route = createFileRoute("/connect-ai")({
  validateSearch: (search: Record<string, unknown>): Partial<Record<"state" | "challenge" | "client" | "domain" | "redirect_host" | "local", string>> => {
    const read = (key: string) => (typeof search[key] === "string" ? (search[key] as string) : undefined);
    return { state: read("state"), challenge: read("challenge"), client: read("client"), domain: read("domain"), redirect_host: read("redirect_host"), local: read("local") };
  },
  component: ConnectAiPage,
});

function ConnectAiPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const search = Route.useSearch();
  const mcpOrigin = getMcpOrigin();

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" search={{ redirect: `${window.location.pathname}${window.location.search}` }} replace />;
  }

  const request: ConnectRequest | undefined = search.state && search.challenge && search.client && search.redirect_host
    ? { state: search.state, challenge: search.challenge, client: search.client, domain: search.domain, redirectHost: search.redirect_host, local: search.local === "1" }
    : undefined;

  if (!request) return <Navigate to="/app" replace />;
  if (!hasMcpPlan(user.plan)) return <Paywall title={`Pick a plan to connect ${request.client}`} />;

  return (
    <>
      <Helmet>
        <title>Connect your AI tool — Stage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-dvh bg-[#F5F5F5] p-1">
        <div className="flex min-h-[calc(100dvh-8px)] items-center justify-center rounded-[8px] bg-white px-4 py-12">
          <div className="flex w-full max-w-[420px] flex-col items-start">
            <img src={stageLogo} alt="Stage" className="mb-5 h-[23px] w-auto" />
            {!mcpOrigin ? (
              <p className="text-[13px] font-medium text-[#DC2626]">Connecting AI tools isn't available on this address.</p>
            ) : (
              <ApproveConnection request={request} mcpOrigin={mcpOrigin} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ApproveConnection({ request, mcpOrigin }: { request: ConnectRequest; mcpOrigin: string }) {
  const createCode = useMutation(api.developer.mcpConnect.createConnectCode);
  const spaces = useQuery(api.workspaceMembers.listSpaces);
  const [picked, setPicked] = useState<Set<string>>();
  // Everything allowed by default; the user unticks what the tool may not do.
  const [permissions, setPermissions] = useState<McpPermission[]>(ALL_MCP_PERMISSIONS);
  const togglePermission = (id: McpPermission) =>
    setPermissions((current) => (current.includes(id) ? withoutDependents(current, id) : withNeeded([...current, id])));
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "connecting" } | { kind: "error"; message: string }>({ kind: "idle" });
  const workspaceIds = picked ?? new Set(spaces?.filter((space) => space.role === "owner").map((space) => space.ownerUserId));
  const toggleWorkspace = (id: string) => {
    const next = new Set(workspaceIds);
    if (!next.delete(id)) next.add(id);
    setPicked(next);
  };

  const finish = (params: Record<string, string>) => {
    const callback = new URL("/callback", mcpOrigin);
    callback.searchParams.set("state", request.state);
    for (const [key, value] of Object.entries(params)) callback.searchParams.set(key, value);
    window.location.assign(callback.toString());
  };

  const approve = async () => {
    setStatus({ kind: "connecting" });
    try {
      const { code } = await createCode({
        codeChallenge: request.challenge,
        clientName: request.client,
        workspaceIds: [...workspaceIds],
        permissions,
      });
      finish({ code });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not connect. Try again." });
    }
  };

  return (
    <>
      <h1 className="text-[21px] font-semibold leading-[1.2] text-[#0A0A0A]">Allow {request.client} to use Stage?</h1>
      <p className="mt-2.5 text-[13px] font-medium leading-[1.5] text-[#525252]">
        {request.client} can view the projects in the workspaces you choose, and do only the steps you allow below.
      </p>
      <fieldset className="mt-5 w-full">
        <legend className="mb-2 text-[12px] font-semibold text-[#171717]">Workspaces</legend>
        {spaces?.map((space) => (
          <label key={space.ownerUserId} className="flex items-center gap-2 py-1 text-[13px] font-medium text-[#404040]">
            <input type="checkbox" checked={workspaceIds.has(space.ownerUserId)} onChange={() => toggleWorkspace(space.ownerUserId)} className="accent-[#463FBA]" />
            {space.role === "owner" ? `${space.name} (yours)` : space.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="mt-4 w-full">
        <legend className="mb-2 text-[12px] font-semibold text-[#171717]">Permissions</legend>
        <label className="flex items-start gap-2 py-1 text-[13px] font-medium text-[#404040]">
          <input type="checkbox" checked disabled className="mt-[3px] accent-[#463FBA]" />
          <span>View projects and results <span className="text-[#737373]">· always on</span></span>
        </label>
        {MCP_PERMISSIONS.map((permission) => (
          <label key={permission.id} className="flex items-start gap-2 py-1 text-[13px] font-medium text-[#404040]">
            <input type="checkbox" checked={permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} className="mt-[3px] accent-[#463FBA]" />
            <span className="flex flex-col">
              <span>
                {permission.label}
                {permission.usesCredits ? <span className="ml-1.5 rounded-[4px] bg-[#EEEDFD] px-1.5 py-px text-[11px] text-[#463FBA]">Uses credits</span> : null}
              </span>
              <span className="text-[12px] text-[#737373]">
                {permission.description}
                {permission.needs.length > 0 ? ` Needs ${permission.needs.map(mcpPermissionLabel).join(" and ")}.` : ""}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <dl className="mt-5 w-full rounded-[8px] bg-[#F5F5F5] p-3 text-[12px] font-medium leading-[1.5] text-[#525252]">
        <div className="flex justify-between gap-3"><dt>App</dt><dd className="truncate text-[#171717]">{request.domain ?? `${request.client} (name not verified)`}</dd></div>
        <div className="flex justify-between gap-3"><dt>Access goes to</dt><dd className="truncate text-[#171717]">{request.redirectHost}</dd></div>
      </dl>
      {request.local ? (
        <p className="mt-3 flex gap-2 text-[12px] font-medium leading-[1.5] text-[#B45309]">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          This sends access to an app on your computer. Continue only if you just started connecting from it.
        </p>
      ) : null}
      {status.kind === "error" ? <p role="alert" className="mt-3 text-[12px] font-medium text-[#DC2626]">{status.message}</p> : null}
      <div className="mt-6 flex w-full gap-2">
        <button
          type="button"
          disabled={status.kind === "connecting"}
          onClick={() => finish({ error: "access_denied" })}
          className="h-[38px] flex-1 rounded-[6px] border border-[#D4D4D4] bg-gradient-to-b from-[#FAFAFA] to-[#E5E5E5] text-[13px] font-medium text-[#404040] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={status.kind === "connecting" || workspaceIds.size === 0}
          onClick={() => void approve()}
          className="h-[38px] flex-1 rounded-[6px] border border-[rgba(158,153,248,0.75)] bg-gradient-to-b from-[#7b76df] to-[#463fba] text-[13px] font-medium text-[#FAFAFA] shadow-[0_0.45px_1px_rgba(10,10,10,0.25)] hover:opacity-95 disabled:opacity-60"
        >
          {status.kind === "connecting" ? "Connecting…" : "Allow"}
        </button>
      </div>
    </>
  );
}
