import { create } from "zustand";
import { api } from "@/lib/api";
import { resetSocket } from "@/lib/socket";

interface AuthState {
  user: any | null;
  token: string | null;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  loadError: string | null;
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
  hasLoadedOnce: false,
  loadError: null,

  login: async (email, password) => {
    const res = await api.login({ email, password });
    api.setToken(res.token);
    set({ user: res.user, token: res.token });
  },

  register: async (data) => {
    const res = await api.register(data);
    api.setToken(res.token);
    set({ user: res.user, token: res.token });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    api.setToken(null);
    resetSocket();
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
      // Refresh token httpOnly cookie'de - yeni access token al
      const refreshRes = await api.refreshToken();
      api.setToken(refreshRes.token);
      const res = await api.getMe();
      set({ user: res.user, token: refreshRes.token, isLoading: false, hasLoadedOnce: true, loadError: null });
    } catch (err: any) {
      const msg = err?.message || "";
      // Refresh başarısız — oturum yok
      api.setToken(null);
      resetSocket();
      set({ user: null, token: null, isLoading: false, loadError: null });
    }
  },
}));
