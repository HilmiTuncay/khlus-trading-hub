import { create } from "zustand";
import type { VoiceUser } from "@khlus/shared";

export interface VoiceParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface VoiceState {
  activeChannelId: string | null;
  // LiveKit katılımcıları (kendi odamız)
  participants: Record<string, VoiceParticipant[]>;
  // Socket üzerinden gelen tüm oda bilgileri (herkes görebilir)
  channelUsers: Record<string, VoiceUser[]>;
  joinChannel: (channelId: string) => void;
  leaveChannel: () => void;
  setParticipants: (channelId: string, list: VoiceParticipant[]) => void;
  setChannelUsers: (channelId: string, users: VoiceUser[]) => void;
  addChannelUser: (channelId: string, user: VoiceUser) => void;
  removeChannelUser: (channelId: string, userId: string) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannelId: null,
  participants: {},
  channelUsers: {},

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
}));
