import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { getClients, getSubscription } from "@/data-ops/queries";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TogglePill } from "@/components/ui/TogglePill";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "freelancer", label: "Freelancer" },
  { value: "studio", label: "Studio" },
  { value: "in-house", label: "In-house" },
  { value: "agency", label: "Agency" },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: getClients });
  const { data: subscription } = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "freelancer");
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  function handleSave() {
    // { Replace: API call }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <Helmet>
        <title>Settings — Stage</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-[560px] px-12 pb-20 pt-10"
      >
        <h1 className="mb-10 font-heading text-[28px] font-semibold text-text-primary">
          Settings
        </h1>

        {/* Profile Section */}
        <Section title="Profile">
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user?.name ?? ""} src={user?.avatarUrl} size="lg" />
            <button className="cursor-pointer text-[13px] font-medium text-accent transition-colors hover:text-accent-hover">
              Change photo
            </button>
          </div>

          <div className="space-y-4">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
            />
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-[13px] font-medium text-text-secondary">
              Role
            </label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <TogglePill
                  key={r.value}
                  label={r.label}
                  selected={role === r.value}
                  onSelect={() => {
                    setRole(r.value);
                    handleSave();
                  }}
                />
              ))}
            </div>
          </div>

          {saved && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-[12px] text-text-tertiary"
            >
              Saved
            </motion.p>
          )}
        </Section>

        {/* Plan & Billing */}
        <Section title="Plan & Billing">
          {subscription ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-heading text-[18px] font-semibold text-text-primary capitalize">
                  {subscription.plan} Plan
                </span>
                <Badge variant="accent">Active</Badge>
              </div>
              <div className="mb-4 space-y-1.5">
                <div className="text-[14px] text-text-secondary">
                  Billed annually — renews{" "}
                  {formatDate(subscription.currentPeriodEnd)}
                </div>
                {subscription.paymentMethod && (
                  <div className="text-[14px] text-text-secondary">
                    {subscription.paymentMethod.brand} ending in{" "}
                    {subscription.paymentMethod.last4}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">
                  Manage billing
                </Button>
                <Button variant="destructive" size="sm">
                  Cancel plan
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-[14px] text-text-secondary">
                You're on the free plan. Upgrade to get unlimited projects and
                client portal access.
              </p>
              <Button size="sm">Upgrade to Pro</Button>
            </div>
          )}
        </Section>

        {/* Clients */}
        <Section title="Clients">
          {clients && clients.length > 0 ? (
            <div className="space-y-0">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="group flex items-center gap-3 border-b border-border-subtle py-3 last:border-b-0"
                >
                  <Avatar name={client.name} src={client.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-text-primary">
                      {client.name}
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <PencilSimple size={14} className="text-text-secondary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash size={14} className="text-text-secondary" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-text-secondary">No clients yet.</p>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          {!showDelete ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              Delete account
            </Button>
          ) : (
            <div>
              <p className="mb-3 text-[14px] text-text-secondary">
                Type{" "}
                <span className="font-medium text-destructive">DELETE</span> to
                confirm. This action is irreversible.
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
              />
              <div className="mt-3 flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirm !== "DELETE"}
                >
                  Permanently delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteConfirm("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Section>
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-5 font-heading text-[18px] font-semibold text-text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}
