import { create } from "zustand";

export interface VoiceParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface VoiceState {
  activeChannelId: string | null;
  participants: Record<string, VoiceParticipant[]>;
  joinChannel: (channelId: string) => void;
  leaveChannel: () => void;
  setParticipants: (channelId: string, list: VoiceParticipant[]) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeChannelId: null,
  participants: {},

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
}));
