import { create } from "zustand";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";

interface DMState {
  conversations: any[];
  activeConversation: any | null;
  targetUserId: string | null;
  messages: any[];
  loading: boolean;
  loadConversations: () => Promise<void>;
  setActiveConversation: (conv: any | null) => void;
  openConversation: (conv: any) => Promise<void>;
  setTargetUserId: (userId: string | null) => void;
  setMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
  sendMessage: (content: string) => Promise<void>;
  createNewConversation: (targetId: string) => Promise<void>;
}

export const useDMStore = create<DMState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  targetUserId: null,
  messages: [],
  loading: false,

  loadConversations: async () => {
    try {
      const res = await api.getConversations();
      set({ conversations: res.conversations });
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv });
    if (!conv) {
      set({ messages: [] });
    }
  },

  openConversation: async (conv) => {
    set({ activeConversation: conv, loading: true });
    try {
      const res = await api.getDMMessages(conv.id);
      set({ messages: res.messages, loading: false });
    } catch (err) {
      console.error("Failed to load DM messages:", err);
      set({ loading: false });
    }
  },

  setTargetUserId: (userId) => {
    set({ targetUserId: userId });
  },

  setMessages: (msgs) => {
    if (typeof msgs === "function") {
      set((state) => ({ messages: msgs(state.messages) }));
    } else {
      set({ messages: msgs });
    }
  },

  sendMessage: async (content) => {
    const { activeConversation } = get();
    if (!content.trim() || !activeConversation) return;
    try {
      await api.sendDM(activeConversation.id, content);
    } catch (err) {
      console.error("Failed to send DM:", err);
    }
  },

  createNewConversation: async (targetId) => {
    try {
      const res = await api.createConversation(targetId);
      await get().loadConversations();
      const convRes = await api.getDMMessages(res.conversation.id);
      set({
        activeConversation: { id: res.conversation.id },
        messages: convRes.messages,
        targetUserId: null,
      });
    } catch (err: any) {
      alert(err.message);
    }
  },
}));
