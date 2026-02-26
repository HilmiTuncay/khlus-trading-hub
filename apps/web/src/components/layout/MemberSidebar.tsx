"use client";

import { useServerStore } from "@/stores/server";
import clsx from "clsx";

const statusColors: Record<string, string> = {
  online: "bg-accent-green",
  idle: "bg-accent-yellow",
  dnd: "bg-accent-red",
  offline: "bg-text-muted",
};

export function MemberSidebar() {
  const { activeServer } = useServerStore();

  if (!activeServer) return null;

  const members = activeServer.members || [];
  const online = members.filter((m: any) => m.user?.status !== "offline");
  const offline = members.filter((m: any) => m.user?.status === "offline");

  return (
    <div className="hidden w-60 flex-col bg-surface-secondary lg:flex">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Online members */}
        {online.length > 0 && (
          <MemberGroup title={`Çevrimiçi — ${online.length}`} members={online} />
        )}

        {/* Offline members */}
        {offline.length > 0 && (
          <MemberGroup title={`Çevrimdışı — ${offline.length}`} members={offline} />
        )}
      </div>
    </div>
  );
}

function MemberGroup({ title, members }: { title: string; members: any[] }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase text-text-muted">
        {title}
      </h3>
      {members.map((member: any) => (
        <div
          key={member.id}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-elevated"
        >
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay text-xs font-bold">
              {member.user?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div
              className={clsx(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-secondary",
                statusColors[member.user?.status || "offline"]
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {member.nickname || member.user?.displayName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
