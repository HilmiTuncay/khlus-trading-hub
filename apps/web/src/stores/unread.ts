import { create } from "zustand";

interface UnreadState {
  channels: Record<string, number>;
  dms: Record<string, number>;
  increment: (type: "channel" | "dm", id: string) => void;
  reset: (type: "channel" | "dm", id: string) => void;
  getCount: (type: "channel" | "dm", id: string) => number;
  getTotalDMs: () => number;
}

function syncTrayBadge(state: { channels: Record<string, number>; dms: Record<string, number> }) {
  if (typeof window === "undefined") return;
  const totalChannels = Object.values(state.channels).reduce((sum, n) => sum + n, 0);
  const totalDMs = Object.values(state.dms).reduce((sum, n) => sum + n, 0);
  const total = totalChannels + totalDMs;
  window.electronAPI?.setTrayBadge(total);
  if (total > 0) {
    document.title = `(${total}) Khlus Trading Hub`;
  } else {
    document.title = "Khlus Trading Hub";
  }
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
    syncTrayBadge(get());
  },

  reset: (type, id) => {
    set((state) => {
      const key = type === "channel" ? "channels" : "dms";
      const next = { ...state[key] };
      delete next[id];
      return { [key]: next };
    });
    syncTrayBadge(get());
  },

  getCount: (type, id) => {
    const state = get();
    return type === "channel" ? (state.channels[id] || 0) : (state.dms[id] || 0);
  },

  getTotalDMs: () => {
    return Object.values(get().dms).reduce((sum, n) => sum + n, 0);
  },
}));
