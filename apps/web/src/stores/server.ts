import { create } from "zustand";
import { api } from "@/lib/api";

// Frontend permission helper
export function getUserPermissions(server: any, userId: string): bigint {
  if (!server || !userId) return 0n;
  if (server.ownerId === userId) return ~0n; // Sahip = tüm yetkiler

  const member = server.members?.find((m: any) => m.userId === userId);
  if (!member) return 0n;

  let perms = 0n;
  for (const mr of member.roles || []) {
    perms |= BigInt(mr.role?.permissions || "0");
  }
  return perms;
}

export function userHasPermission(server: any, userId: string, permission: bigint): boolean {
  const perms = getUserPermissions(server, userId);
  if ((perms & 1n) !== 0n) return true; // ADMINISTRATOR
  return (perms & permission) === permission;
}

interface ServerState {
  servers: any[];
  activeServer: any | null;
  activeChannel: any | null;
  isLoading: boolean;
  isDMMode: boolean;
  loadServers: () => Promise<void>;
  setActiveServer: (serverId: string) => Promise<void>;
  setDMMode: (active: boolean) => void;
  setActiveChannel: (channel: any) => void;
  createServer: (name: string) => Promise<any>;
  joinServer: (inviteCode: string) => Promise<any>;
  updateServer: (serverId: string, data: { name?: string }) => Promise<any>;
  deleteServer: (serverId: string) => Promise<void>;
  regenerateInviteCode: (serverId: string) => Promise<string>;
  createChannel: (data: { serverId: string; name: string; type: string; categoryId?: string }) => Promise<any>;
  updateChannel: (channelId: string, data: { name?: string; topic?: string | null }) => Promise<any>;
  deleteChannel: (channelId: string) => Promise<void>;
  createCategory: (serverId: string, name: string) => Promise<any>;
  updateCategory: (categoryId: string, name: string) => Promise<any>;
  deleteCategory: (categoryId: string) => Promise<void>;
  refreshActiveServer: () => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServer: null,
  activeChannel: null,
  isLoading: false,
  isDMMode: false,

  setDMMode: (active) => {
    set({ isDMMode: active });
  },

  loadServers: async () => {
    set({ isLoading: true });
    try {
      const res = await api.getServers();
      set({ servers: res.servers, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveServer: async (serverId: string) => {
    try {
      const res = await api.getServer(serverId);
      const firstTextChannel = res.server.channels?.find(
        (c: any) => c.type === "text"
      );
      set({
        activeServer: res.server,
        activeChannel: firstTextChannel || null,
        isDMMode: false,
      });
    } catch (error) {
      console.error("Failed to load server:", error);
    }
  },

  setActiveChannel: (channel) => {
    set({ activeChannel: channel });
  },

  createServer: async (name: string) => {
    const res = await api.createServer(name);
    const { servers } = get();
    set({ servers: [...servers, res.server] });
    return res.server;
  },

  joinServer: async (inviteCode: string) => {
    const res = await api.joinServer(inviteCode);
    await get().loadServers();
    return res.server;
  },

  updateServer: async (serverId: string, data: { name?: string }) => {
    const res = await api.updateServer(serverId, data);
    const { servers, activeServer } = get();
    set({
      servers: servers.map((s) => (s.id === serverId ? { ...s, ...res.server } : s)),
      activeServer: activeServer?.id === serverId ? { ...activeServer, ...res.server } : activeServer,
    });
    return res.server;
  },

  deleteServer: async (serverId: string) => {
    await api.deleteServer(serverId);
    const { servers, activeServer } = get();
    const remaining = servers.filter((s) => s.id !== serverId);
    set({
      servers: remaining,
      activeServer: activeServer?.id === serverId ? null : activeServer,
      activeChannel: activeServer?.id === serverId ? null : get().activeChannel,
    });
  },

  regenerateInviteCode: async (serverId: string) => {
    const res = await api.regenerateInviteCode(serverId);
    const { activeServer } = get();
    if (activeServer?.id === serverId) {
      set({ activeServer: { ...activeServer, inviteCode: res.inviteCode } });
    }
    return res.inviteCode;
  },

  createChannel: async (data) => {
    const res = await api.createChannel(data);
    await get().refreshActiveServer();
    return res.channel;
  },

  updateChannel: async (channelId, data) => {
    const res = await api.updateChannel(channelId, data);
    await get().refreshActiveServer();
    return res.channel;
  },

  deleteChannel: async (channelId) => {
    await api.deleteChannel(channelId);
    const { activeChannel } = get();
    if (activeChannel?.id === channelId) {
      set({ activeChannel: null });
    }
    await get().refreshActiveServer();
  },

  createCategory: async (serverId, name) => {
    const res = await api.createCategory({ serverId, name });
    await get().refreshActiveServer();
    return res.category;
  },

  updateCategory: async (categoryId, name) => {
    const res = await api.updateCategory(categoryId, name);
    await get().refreshActiveServer();
    return res.category;
  },

  deleteCategory: async (categoryId) => {
    await api.deleteCategory(categoryId);
    await get().refreshActiveServer();
  },

  refreshActiveServer: async () => {
    const { activeServer } = get();
    if (!activeServer) return;
    try {
      const res = await api.getServer(activeServer.id);
      const { activeChannel } = get();
      set({
        activeServer: res.server,
        activeChannel: activeChannel
          ? res.server.channels?.find((c: any) => c.id === activeChannel.id) || null
          : null,
      });
    } catch (error) {
      console.error("Failed to refresh server:", error);
    }
  },
}));
