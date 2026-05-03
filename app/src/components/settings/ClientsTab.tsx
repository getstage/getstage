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
      <div className="settings-section-card">
        <div className="settings-section-title">Your clients</div>
        <div className="settings-section-description">Manage clients across all your projects.</div>

          {isLoading ? (
            <div className="settings-client-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="settings-client-row client-card-skeleton" aria-hidden="true">
                  <div className="settings-client-main">
                    <div className="h-10 w-10 rounded-full bg-border-subtle" />
                    <div className="flex-1">
                      <div className="h-3.5 w-24 rounded-full bg-border-subtle" />
                      <div className="mt-2 h-3 w-32 rounded-full bg-border-subtle" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <div className="settings-client-list">
              {clients.map((client) => (
                <article key={client.id} className="settings-client-row">
                  <div className="settings-client-main">
                    <Avatar
                      name={client.name}
                      src={client.avatarUrl}
                      size="lg"
                      className="client-card-avatar"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="settings-client-title-row">
                        <h3 className="truncate text-[13px] font-medium text-text-primary">
                          {client.name}
                        </h3>
                      </div>

                      <p className="mt-1 truncate text-[12px] text-text-secondary">
                        {client.email ?? "No email on file"}
                      </p>
                      <p className="mt-3 text-[12px] text-text-tertiary">
                        {client.projectCount > 0
                          ? "Already linked to active workspace history."
                          : "Client exists but is not linked to a project yet."}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={client.projectCount > 0 ? "accent" : "default"}
                    className="settings-client-project-badge"
                  >
                    {client.projectCount} Project{client.projectCount !== 1 ? "s" : ""}
                  </Badge>
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
        <div className="settings-client-footer">
          <span>{totalProjects} Projects</span>
          <span>•</span>
          <span>{clients.length} Clients</span>
        </div>
      </div>
    </div>
  );
}
