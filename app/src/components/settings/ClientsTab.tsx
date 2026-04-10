import { Link } from "@tanstack/react-router";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { SettingsClient } from "@/hooks/useSettingsClients";

type ClientsTabProps = {
  active: boolean;
  clients: SettingsClient[];
  isLoading: boolean;
};

export function ClientsTab({ active, clients, isLoading }: ClientsTabProps) {
  const totalProjects = clients.reduce((sum, client) => sum + client.projectCount, 0);

  return (
    <div className={`tab-content ${active ? "active" : ""}`}>
      <div className="settings-card">
        <div className="card-body">
          <div className="card-heading sf">Your clients</div>
          <div className="card-desc">Manage clients across all your projects.</div>

          <div className="clients-summary-grid">
            <div className="client-summary-pill">
              <span className="client-summary-value">{clients.length}</span>
              <span className="client-summary-label">Clients</span>
            </div>
            <div className="client-summary-pill">
              <span className="client-summary-value">{totalProjects}</span>
              <span className="client-summary-label">Projects</span>
            </div>
          </div>

          {isLoading ? (
            <div className="client-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="client-card client-card-skeleton" aria-hidden="true">
                  <div className="client-card-header">
                    <div className="h-10 w-10 rounded-full bg-border-subtle" />
                    <div className="flex-1">
                      <div className="h-3.5 w-24 rounded-full bg-border-subtle" />
                      <div className="mt-2 h-3 w-32 rounded-full bg-border-subtle" />
                    </div>
                  </div>
                  <div className="mt-5 h-8 rounded-[12px] bg-border-subtle" />
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <div className="client-grid">
              {clients.map((client) => (
                <article key={client.id} className="client-card">
                  <div className="client-card-header">
                    <Avatar
                      name={client.name}
                      src={client.avatarUrl}
                      size="lg"
                      className="client-card-avatar"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[14px] font-medium text-text-primary">
                          {client.name}
                        </h3>
                        <Badge
                          variant={client.projectCount > 0 ? "accent" : "default"}
                          className="shrink-0"
                        >
                          {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <p className="mt-1 truncate text-[12px] text-text-secondary">
                        {client.email ?? "No email on file"}
                      </p>
                    </div>
                  </div>

                  <div className="client-card-footer">
                    <span className="text-[12px] text-text-tertiary">
                      {client.projectCount > 0
                        ? "Already linked to active workspace history."
                        : "Client exists but is not linked to a project yet."}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="clients-empty-state">
              <p className="text-[13px] text-text-tertiary">
                No clients yet. Create a project to get started.
              </p>
              <Link to="/new-project" className="clients-empty-link">
                Create a project
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
