import { create } from "zustand";
import { api } from "@/lib/api";

interface ServerState {
  servers: any[];
  activeServer: any | null;
  activeChannel: any | null;
  isLoading: boolean;
  loadServers: () => Promise<void>;
  setActiveServer: (serverId: string) => Promise<void>;
  setActiveChannel: (channel: any) => void;
  createServer: (name: string) => Promise<any>;
  joinServer: (inviteCode: string) => Promise<any>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServer: null,
  activeChannel: null,
  isLoading: false,

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
}));
