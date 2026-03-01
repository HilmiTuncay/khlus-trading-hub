import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth";
import type { VoiceUser } from "@khlus/shared";

export interface VoiceParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface ActiveVoiceChannel {
  id: string;
  name: string;
  type: "voice" | "video";
  serverId: string;
}

interface VoiceState {
  activeChannelId: string | null;
  // LiveKit katilimcilari (kendi odamiz)
  participants: Record<string, VoiceParticipant[]>;
  // Socket uzerinden gelen tum oda bilgileri (herkes gorebilir)
  channelUsers: Record<string, VoiceUser[]>;
  // Kalici ses baglantisi icin yeni alanlar
  isConnected: boolean;
  activeVoiceChannel: ActiveVoiceChannel | null;
  livekitToken: string | null;
  livekitUrl: string | null;
  // Aksiyonlar
  joinChannel: (channelId: string) => void;
  leaveChannel: () => void;
  setParticipants: (channelId: string, list: VoiceParticipant[]) => void;
  setChannelUsers: (channelId: string, users: VoiceUser[]) => void;
  addChannelUser: (channelId: string, user: VoiceUser) => void;
  removeChannelUser: (channelId: string, userId: string) => void;
  connectToVoice: (channel: ActiveVoiceChannel, token: string, url: string) => void;
  disconnectVoice: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeChannelId: null,
  participants: {},
  channelUsers: {},
  isConnected: false,
  activeVoiceChannel: null,
  livekitToken: null,
  livekitUrl: null,

  joinChannel: (channelId) => {
    set({ activeChannelId: channelId });
  },

  leaveChannel: () => {
    set((state) => {
      const newParticipants = { ...state.participants };
      if (state.activeChannelId) {
        delete newParticipants[state.activeChannelId];
      }
      return { activeChannelId: null, participants: newParticipants };
    });
  },

  setParticipants: (channelId, list) => {
    set((state) => ({
      participants: { ...state.participants, [channelId]: list },
    }));
  },

  setChannelUsers: (channelId, users) => {
    set((state) => ({
      channelUsers: { ...state.channelUsers, [channelId]: users },
    }));
  },

  addChannelUser: (channelId, user) => {
    set((state) => {
      const current = state.channelUsers[channelId] || [];
      if (current.some((u) => u.userId === user.userId)) return state;
      return {
        channelUsers: { ...state.channelUsers, [channelId]: [...current, user] },
      };
    });
  },

  removeChannelUser: (channelId, userId) => {
    set((state) => {
      const current = state.channelUsers[channelId] || [];
      const filtered = current.filter((u) => u.userId !== userId);
      const newChannelUsers = { ...state.channelUsers };
      if (filtered.length === 0) {
        delete newChannelUsers[channelId];
      } else {
        newChannelUsers[channelId] = filtered;
      }
      return { channelUsers: newChannelUsers };
    });
  },

  connectToVoice: (channel, token, url) => {
    set({
      isConnected: true,
      activeVoiceChannel: channel,
      livekitToken: token,
      livekitUrl: url,
      activeChannelId: channel.id,
    });
  },

  disconnectVoice: () => {
    const state = get();
    const userId = useAuthStore.getState().user?.id;
    if (state.activeVoiceChannel && userId) {
      getSocket()?.emit("voice:leave", { channelId: state.activeVoiceChannel.id, userId });
    }

    const newParticipants = { ...state.participants };
    if (state.activeVoiceChannel?.id) {
      delete newParticipants[state.activeVoiceChannel.id];
    }

    set({
      isConnected: false,
      activeVoiceChannel: null,
      livekitToken: null,
      livekitUrl: null,
      activeChannelId: null,
      participants: newParticipants,
    });
  },
}));
