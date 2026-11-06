import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { useAuth, useSignOut } from "@/lib/auth";
import { api } from "@/lib/convex";
import { cn } from "@/lib/utils";
import { Card, PageHeader } from "./AppShell";

// Settings on the web: the parts of the Mac Settings that work without the Mac app (profile, billing and credits, account).
const PLAN_LABEL: Record<string, string> = { start: "Solo", pro: "Studio", team: "Agency", free: "Free" };

const ROLES = [
  { id: "freelancer", label: "Freelancer" },
  { id: "studio", label: "Studio" },
  { id: "in-house", label: "In-house" },
  { id: "agency", label: "Agency" },
] as const;

type Role = (typeof ROLES)[number]["id"];

const BUTTON = "rounded-[6px] border-[0.5px] border-[#D4D4D4] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-[#171717] disabled:opacity-50";

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account" />
      <ProfileCard />
      <BillingCard />
      <AccountCard />
    </>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const updateProfile = useMutation(api.settings.updateProfile);
  const [name, setName] = useState(user?.name ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async (patch: { name?: string; role?: Role }) => {
    setStatus("saving");
    try {
      await updateProfile(patch);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  if (!user) return null;
  return (
    <Card title="Profile" subtitle="How you appear in Stage" bodyClassName="gap-5 p-4">
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          void save({ name: name.trim() });
        }}
      >
        <label htmlFor="settings-name" className="text-[13px] font-medium text-[#171717]">Full name</label>
        <div className="flex gap-2">
          <input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-[6px] border-[0.5px] border-[#D4D4D4] px-2.5 py-1.5 text-[13px]" />
          <button type="submit" disabled={!name.trim() || name.trim() === user.name || status === "saving"} className={BUTTON}>Save</button>
        </div>
      </form>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-medium text-[#171717]">Role</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              aria-pressed={user.role === role.id}
              onClick={() => void save({ role: role.id })}
              className={cn(
                "rounded-[6px] border-[0.5px] px-3 py-2 text-[13px] font-medium",
                user.role === role.id ? "border-[#9E99F8] bg-[#EFEEFE] text-[#221E6C]" : "border-[#E5E5E5] bg-[#FAFAFA] text-[#404040]",
              )}
            >
              {role.label}
            </button>
          ))}
        </div>
      </fieldset>
      {status === "saved" ? <p role="status" className="text-[12px] text-[#047857]">Saved.</p> : null}
      {status === "error" ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">Couldn't save. Try again.</p> : null}
    </Card>
  );
}

function BillingCard() {
  const { user } = useAuth();
  const subscription = useQuery(api.billing.getCurrentSubscription);
  const credits = useQuery(api.credits.getCreditSummary, {});
  const openPortal = useAction(api.billing.createCustomerPortalSession);
  const [error, setError] = useState<string>();

  const manage = async () => {
    setError(undefined);
    try {
      const { url } = await openPortal({ platform: "web" });
      window.location.assign(url);
    } catch {
      setError("Couldn't open billing. Try again.");
    }
  };

  if (!user) return null;
  return (
    <Card title="Billing & Credits" subtitle="Your plan, payment method and AI credits" aside={<button type="button" onClick={() => void manage()} className={BUTTON}>Manage billing</button>} bodyClassName="gap-4 p-4">
      <dl className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-3">
        <div className="flex flex-col gap-0.5"><dt className="text-[12px] text-[#737373]">Plan</dt><dd className="font-medium text-[#171717]">Stage {PLAN_LABEL[user.plan] ?? user.plan}</dd></div>
        {subscription ? (
          <>
            <div className="flex flex-col gap-0.5"><dt className="text-[12px] text-[#737373]">Billing cycle</dt><dd className="font-medium capitalize text-[#171717]">{subscription.billingCycle}</dd></div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[12px] text-[#737373]">{subscription.cancelAtPeriodEnd ? "Access until" : "Renews"}</dt>
              <dd className="font-medium text-[#171717]">{new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: "medium" })}</dd>
            </div>
          </>
        ) : null}
      </dl>
      {credits ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-[#171717]">{credits.total.toLocaleString()} credits left</span>
            <span className="text-[12px] text-[#737373]">of {credits.granted.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
            <div className="h-full rounded-full bg-[#7B76DF]" style={{ width: `${credits.granted ? Math.min(100, (credits.total / credits.granted) * 100) : 0}%` }} />
          </div>
          <p className="text-[12px] text-[#737373]">Credits pay for runs Stage does itself (on Mac). Work your own AI tool saves through the MCP uses none.</p>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12px] font-medium text-[#DC2626]">{error}</p> : null}
    </Card>
  );
}

function AccountCard() {
  const { user } = useAuth();
  const signOut = useSignOut();
  if (!user) return null;
  return (
    <Card title="Account" bodyClassName="gap-3 p-4">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="flex flex-col gap-0.5"><span className="text-[12px] text-[#737373]">Email</span><span className="font-medium text-[#171717]">{user.email}</span></span>
        <button type="button" onClick={() => void signOut().then(() => window.location.assign("/"))} className={BUTTON}>Log out</button>
      </div>
      <div className="h-px bg-[#E5E5E5]" />
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="flex flex-col gap-0.5"><span className="font-medium text-[#171717]">Public profile</span><span className="text-[12px] text-[#737373]">Your builder page with your tools and skills</span></span>
        <a href="/profile" className={BUTTON}>Open</a>
      </div>
      <p className="text-[12px] text-[#737373]">Teams, clients, shortcuts and deleting your account are in Stage for Mac.</p>
    </Card>
  );
}
