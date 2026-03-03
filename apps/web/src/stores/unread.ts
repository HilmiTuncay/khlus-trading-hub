import { create } from "zustand";

interface UnreadState {
  channels: Record<string, number>;
  dms: Record<string, number>;
  increment: (type: "channel" | "dm", id: string) => void;
  reset: (type: "channel" | "dm", id: string) => void;
  getCount: (type: "channel" | "dm", id: string) => number;
  getTotalDMs: () => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  channels: {},
  dms: {},

  increment: (type, id) => {
    set((state) => {
      const key = type === "channel" ? "channels" : "dms";
      return {
        [key]: { ...state[key], [id]: (state[key][id] || 0) + 1 },
      };
    });
  },

  reset: (type, id) => {
    set((state) => {
      const key = type === "channel" ? "channels" : "dms";
      const next = { ...state[key] };
      delete next[id];
      return { [key]: next };
    });
  },

  getCount: (type, id) => {
    const state = get();
    return type === "channel" ? (state.channels[id] || 0) : (state.dms[id] || 0);
  },

  getTotalDMs: () => {
    return Object.values(get().dms).reduce((sum, n) => sum + n, 0);
  },
}));
