import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useClientsQuery } from "@/hooks/convex-data";
import { SettingsCard, SettingsRow } from "./SettingsPrimitives";

export function ClientsPanel() {
  const clientsQuery = useClientsQuery();
  const clients = clientsQuery.data ?? [];
  const totalProjects = useMemo(
    () => clients.reduce((sum, client) => sum + client.projectCount, 0),
    [clients],
  );

  return (
    <SettingsCard title="Your clients">
      <p className="-mt-[12px] px-[12px] pb-[12px] text-[12px] font-normal leading-[1.5] text-[#404040]">
        Manage clients across all your projects.
      </p>
      <div className="flex flex-col gap-[4px]">
        {clientsQuery.isLoading ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
              Loading clients...
            </p>
          </SettingsRow>
        ) : null}
        {!clientsQuery.isLoading && clients.length === 0 ? (
          <SettingsRow>
            <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
              No clients yet. Create a project with a client to see them here.
            </p>
          </SettingsRow>
        ) : null}
        {clients.map((client) => (
          <SettingsRow key={client.id}>
            <div className="flex items-center justify-between gap-[18px]">
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center gap-[12px]">
                  <Avatar name={client.name} src={client.avatarUrl} size="md" />
                  <div>
                    <h3 className="text-[13px] font-medium leading-[1.5] text-[#0A0A0A]">{client.name}</h3>
                    <p className="text-[12px] font-normal leading-[1.5] text-[#404040]">{client.email ?? "No email"}</p>
                  </div>
                </div>
                <p className="text-[12px] font-normal leading-[1.5] text-[#737373]">
                  Already linked to active workspace history.
                </p>
              </div>
              <Badge variant="accent" className="rounded-[4px] bg-[#E7E6FD] px-[6px] py-[4px] text-[12px] font-normal leading-none text-[#221E6C]">
                {client.projectCount} Project
              </Badge>
            </div>
          </SettingsRow>
        ))}
        <div className="px-[20px] py-[6px] text-[13px] text-[#525252]">
          <span className="font-medium text-[#0A0A0A]">{totalProjects}</span> Projects <span className="px-[16px] text-[#A3A3A3]">•</span> <span className="font-medium text-[#0A0A0A]">{clients.length}</span> Clients
        </div>
      </div>
    </SettingsCard>
  );
}
