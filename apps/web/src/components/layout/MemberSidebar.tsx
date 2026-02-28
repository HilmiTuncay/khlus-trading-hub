"use client";

import { useState } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Shield, UserX, Ban, MoreVertical } from "lucide-react";
import clsx from "clsx";

const statusColors: Record<string, string> = {
  online: "bg-accent-green",
  idle: "bg-accent-yellow",
  dnd: "bg-accent-red",
  offline: "bg-text-muted",
};

export function MemberSidebar() {
  const { activeServer, refreshActiveServer } = useServerStore();
  const { user } = useAuthStore();

  if (!activeServer) return null;

  const members = activeServer.members || [];
  const isOwner = activeServer.ownerId === user?.id;
  const online = members.filter((m: any) => m.user?.status !== "offline");
  const offline = members.filter((m: any) => m.user?.status === "offline");

  return (
    <div className="flex w-60 flex-col bg-surface-secondary">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Online members */}
        {online.length > 0 && (
          <MemberGroup
            title={`Çevrimiçi — ${online.length}`}
            members={online}
            server={activeServer}
            currentUserId={user?.id}
            isOwner={isOwner}
            onRefresh={refreshActiveServer}
          />
        )}

        {/* Offline members */}
        {offline.length > 0 && (
          <MemberGroup
            title={`Çevrimdışı — ${offline.length}`}
            members={offline}
            server={activeServer}
            currentUserId={user?.id}
            isOwner={isOwner}
            onRefresh={refreshActiveServer}
          />
        )}
      </div>
    </div>
  );
}

function MemberGroup({
  title,
  members,
  server,
  currentUserId,
  isOwner,
  onRefresh,
}: {
  title: string;
  members: any[];
  server: any;
  currentUserId?: string;
  isOwner: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase text-text-muted">
        {title}
      </h3>
      {members.map((member: any) => (
        <MemberItem
          key={member.id}
          member={member}
          server={server}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function MemberItem({
  member,
  server,
  currentUserId,
  isOwner,
  onRefresh,
}: {
  member: any;
  server: any;
  currentUserId?: string;
  isOwner: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isSelf = member.userId === currentUserId;
  const isServerOwner = member.userId === server.ownerId;
  const canModerate = isOwner && !isSelf && !isServerOwner;

  // Roller: default olmayan roller
  const memberRoles = (member.roles || [])
    .map((mr: any) => mr.role)
    .filter((r: any) => !r.isDefault);

  const handleKick = async () => {
    if (!confirm(`${member.user?.displayName} adlı üyeyi atmak istediğinize emin misiniz?`)) return;
    try {
      await api.kickMember(server.id, member.userId);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
    setShowMenu(false);
  };

  const handleBan = async () => {
    const reason = prompt(`${member.user?.displayName} adlı üyeyi banlamak istediğinize emin misiniz?\nSebep (opsiyonel):`);
    if (reason === null) return; // Cancel
    try {
      await api.banMember(server.id, member.userId, reason || undefined);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
    setShowMenu(false);
  };

  const handleToggleRole = async (roleId: string) => {
    try {
      await api.toggleRoleAssignment(member.id, roleId);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Tüm sunucu rolleri
  const allRoles = (server.roles || []).filter((r: any) => !r.isDefault);
  const memberRoleIds = memberRoles.map((r: any) => r.id);

  return (
    <div className="group relative">
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-elevated cursor-pointer"
        onClick={() => canModerate && setShowMenu(!showMenu)}
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={memberRoles[0] ? { color: memberRoles[0].color } : {}}>
            {member.nickname || member.user?.displayName}
          </p>
          {memberRoles.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {memberRoles.slice(0, 2).map((role: any) => (
                <span
                  key={role.id}
                  className="rounded px-1 text-[10px] font-medium"
                  style={{
                    backgroundColor: role.color + "20",
                    color: role.color,
                  }}
                >
                  {role.name}
                </span>
              ))}
            </div>
          )}
        </div>
        {isServerOwner && (
          <Shield size={12} className="text-brand opacity-50" />
        )}
      </div>

      {/* Context menu */}
      {showMenu && canModerate && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 w-48 rounded-lg bg-surface-primary p-1.5 shadow-lg ring-1 ring-surface-overlay">
            {/* Roller */}
            {allRoles.length > 0 && (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold uppercase text-text-muted">Roller</p>
                {allRoles.map((role: any) => (
                  <button
                    key={role.id}
                    onClick={() => handleToggleRole(role.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="flex-1 text-left">{role.name}</span>
                    {memberRoleIds.includes(role.id) && (
                      <span className="text-accent-green text-[10px]">✓</span>
                    )}
                  </button>
                ))}
                <div className="my-1 h-px bg-surface-overlay" />
              </>
            )}

            <button
              onClick={handleKick}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-accent-red hover:bg-surface-overlay"
            >
              <UserX size={14} />
              Sunucudan At
            </button>
            <button
              onClick={handleBan}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-accent-red hover:bg-surface-overlay"
            >
              <Ban size={14} />
              Banla
            </button>
          </div>
        </>
      )}
    </div>
  );
}
