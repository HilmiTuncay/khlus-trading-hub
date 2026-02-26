const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Bir hata olustu" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async register(data: { email: string; username: string; displayName: string; password: string }) {
    return this.request<{ user: any; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ user: any; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{ user: any }>("/api/auth/me");
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async refreshToken() {
    return this.request<{ token: string }>("/api/auth/refresh", { method: "POST" });
  }

  // Servers
  async getServers() {
    return this.request<{ servers: any[] }>("/api/servers");
  }

  async getServer(serverId: string) {
    return this.request<{ server: any }>(`/api/servers/${serverId}`);
  }

  async createServer(name: string) {
    return this.request<{ server: any }>("/api/servers", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async joinServer(inviteCode: string) {
    return this.request<{ server: any }>(`/api/servers/join/${inviteCode}`, {
      method: "POST",
    });
  }

  // Channels
  async createChannel(data: { serverId: string; name: string; type: string; categoryId?: string }) {
    return this.request<{ channel: any }>("/api/channels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Messages
  async getMessages(channelId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}` : "";
    return this.request<{ messages: any[] }>(`/api/messages/${channelId}${params}`);
  }

  async sendMessage(channelId: string, content: string) {
    return this.request<{ message: any }>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ channelId, content }),
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/api/messages/${messageId}`, { method: "DELETE" });
  }

  // LiveKit
  async getLivekitToken(channelId: string) {
    return this.request<{ token: string; room: string; livekitUrl: string }>("/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({ channelId }),
    });
  }
}

export const api = new ApiClient();
