import { create } from "zustand";
import { api } from "@/lib/api";

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: { displayName?: string; status?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.login({ email, password });
    api.setToken(res.token);
    localStorage.setItem("token", res.token);
    set({ user: res.user, token: res.token });
  },

  register: async (data) => {
    const res = await api.register(data);
    api.setToken(res.token);
    localStorage.setItem("token", res.token);
    set({ user: res.user, token: res.token });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    api.setToken(null);
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  updateProfile: async (data) => {
    const res = await api.updateProfile(data);
    set({ user: res.user });
  },

  loadUser: async () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      api.setToken(token);
      const res = await api.getMe();
      set({ user: res.user, token, isLoading: false });
    } catch {
      localStorage.removeItem("token");
      api.setToken(null);
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
