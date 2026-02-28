const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 30000; // 30s - Render cold start için yeterli
const RETRY_DELAYS = [1000, 3000, 5000]; // 1s, 3s, 5s bekleme

class ApiClient {
  private token: string | null = null;
  private serverAwake = false;

  setToken(token: string | null) {
    this.token = token;
  }

  private translateError(err: unknown): string {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "Sunucu yanıt vermiyor. Sunucu uyanıyor olabilir, lütfen tekrar deneyin.";
    }
    if (err instanceof TypeError && (err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.")) {
      return "Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.";
    }
    if (err instanceof Error) {
      return err.message;
    }
    return "Beklenmeyen bir hata oluştu";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INITIAL_TIMEOUT);

      try {
        const res = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        this.serverAwake = true;

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Bir hata oluştu" }));
          throw new Error(error.error || `HTTP ${res.status}`);
        }

        return res.json();
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err;

        // HTTP hataları (4xx, 5xx) retry yapma - bunlar sunucudan geliyor
        if (err instanceof Error && err.message.startsWith("HTTP ")) throw err;
        // Sunucu yanıt verdiyse (JSON parse hatası hariç) retry yapma
        if (err instanceof Error && !["Failed to fetch", "NetworkError when attempting to fetch resource.", "AbortError"].some(m => err.message.includes(m) || (err as any).name === m)) {
          throw new Error(this.translateError(err));
        }

        // Son deneme değilse bekle ve tekrar dene
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt] || 5000));
        }
      }
    }

    throw new Error(this.translateError(lastError));
  }

  // Sunucu uyanık mı kontrol et (login/register öncesi)
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${API_URL}/health`, {
        signal: controller.signal,
        // credentials yok - /health wildcard CORS kullanıyor
      });
      clearTimeout(timeoutId);
      this.serverAwake = res.ok;
      return res.ok;
    } catch {
      this.serverAwake = false;
      return false;
    }
  }

  isServerAwake() {
    return this.serverAwake;
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

  async updateProfile(data: { displayName?: string; status?: string }) {
    return this.request<{ user: any }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
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

  async updateServer(serverId: string, data: { name?: string; iconUrl?: string | null }) {
    return this.request<{ server: any }>(`/api/servers/${serverId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteServer(serverId: string) {
    return this.request<{ success: boolean }>(`/api/servers/${serverId}`, {
      method: "DELETE",
    });
  }

  async regenerateInviteCode(serverId: string) {
    return this.request<{ inviteCode: string }>(`/api/servers/${serverId}/invite-code`, {
      method: "PATCH",
    });
  }

  // Channels
  async createChannel(data: { serverId: string; name: string; type: string; categoryId?: string }) {
    return this.request<{ channel: any }>("/api/channels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateChannel(channelId: string, data: { name?: string; topic?: string | null; categoryId?: string | null }) {
    return this.request<{ channel: any }>(`/api/channels/${channelId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteChannel(channelId: string) {
    return this.request<{ success: boolean }>(`/api/channels/${channelId}`, {
      method: "DELETE",
    });
  }

  async createCategory(data: { serverId: string; name: string }) {
    return this.request<{ category: any }>("/api/channels/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCategory(categoryId: string, name: string) {
    return this.request<{ category: any }>(`/api/channels/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  async deleteCategory(categoryId: string) {
    return this.request<{ success: boolean }>(`/api/channels/categories/${categoryId}`, {
      method: "DELETE",
    });
  }

  // Messages
  async getMessages(channelId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}` : "";
    return this.request<{ messages: any[] }>(`/api/messages/${channelId}${params}`);
  }

  async sendMessage(channelId: string, content: string, attachments?: any[]) {
    return this.request<{ message: any }>("/api/messages", {
      method: "POST",
      body: JSON.stringify({ channelId, content, attachments }),
    });
  }

  async uploadFiles(files: File[]): Promise<{ attachments: any[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Upload için 60s

    try {
      const res = await fetch(`${API_URL}/api/uploads`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Upload hatası" }));
        throw new Error(error.error || `HTTP ${res.status}`);
      }

      return res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Error(this.translateError(err));
    }
  }

  async deleteMessage(messageId: string) {
    return this.request(`/api/messages/${messageId}`, { method: "DELETE" });
  }

  async togglePin(messageId: string) {
    return this.request<{ message: any }>(`/api/messages/${messageId}/pin`, {
      method: "PUT",
    });
  }

  async getPinnedMessages(channelId: string) {
    return this.request<{ messages: any[] }>(`/api/messages/${channelId}/pinned`);
  }

  async createPoll(data: { channelId: string; question: string; options: string[] }) {
    return this.request<{ message: any }>("/api/messages/poll", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async votePoll(messageId: string, optionIndex: number) {
    return this.request<{ message: any }>(`/api/messages/${messageId}/vote`, {
      method: "PUT",
      body: JSON.stringify({ optionIndex }),
    });
  }

  async sendSignal(data: {
    channelId: string;
    direction: "long" | "short";
    symbol: string;
    entry: string;
    targets: string[];
    stopLoss: string;
    notes?: string;
  }) {
    return this.request<{ message: any }>("/api/messages/signal", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Roles
  async getRoles(serverId: string) {
    return this.request<{ roles: any[] }>(`/api/roles/${serverId}`);
  }

  async createRole(data: { serverId: string; name: string; color?: string; permissions?: string }) {
    return this.request<{ role: any }>("/api/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateRole(roleId: string, data: { name?: string; color?: string; permissions?: string }) {
    return this.request<{ role: any }>(`/api/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteRole(roleId: string) {
    return this.request<{ success: boolean }>(`/api/roles/${roleId}`, {
      method: "DELETE",
    });
  }

  async toggleRoleAssignment(memberId: string, roleId: string) {
    return this.request<{ action: string }>("/api/roles/assign", {
      method: "PUT",
      body: JSON.stringify({ memberId, roleId }),
    });
  }

  // Moderation
  async kickMember(serverId: string, userId: string) {
    return this.request<{ success: boolean }>(`/api/members/${serverId}/kick/${userId}`, {
      method: "POST",
    });
  }

  async banMember(serverId: string, userId: string, reason?: string) {
    return this.request<{ success: boolean }>(`/api/members/${serverId}/ban/${userId}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async unbanMember(serverId: string, userId: string) {
    return this.request<{ success: boolean }>(`/api/members/${serverId}/ban/${userId}`, {
      method: "DELETE",
    });
  }

  async getBans(serverId: string) {
    return this.request<{ bans: any[] }>(`/api/members/${serverId}/bans`);
  }

  // Reactions
  async toggleReaction(messageId: string, emoji: string) {
    return this.request<{ reactions: Record<string, string[]> }>("/api/reactions", {
      method: "PUT",
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  // DM
  async getConversations() {
    return this.request<{ conversations: any[] }>("/api/dm/conversations");
  }

  async createConversation(targetUserId: string) {
    return this.request<{ conversation: { id: string } }>("/api/dm/conversations", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
  }

  async getDMMessages(conversationId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}` : "";
    return this.request<{ messages: any[] }>(`/api/dm/${conversationId}/messages${params}`);
  }

  async sendDM(conversationId: string, content: string) {
    return this.request<{ message: any }>(`/api/dm/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // Search
  async search(query: string, serverId: string, type: "messages" | "members" | "all" = "all") {
    return this.request<{ messages?: any[]; members?: any[] }>(
      `/api/search?query=${encodeURIComponent(query)}&serverId=${serverId}&type=${type}`
    );
  }

  // Events
  async getEvents(serverId: string) {
    return this.request<{ events: any[] }>(`/api/events/${serverId}`);
  }

  async createEvent(data: {
    serverId: string;
    title: string;
    description?: string;
    channelId?: string;
    startAt: string;
    endAt?: string;
  }) {
    return this.request<{ event: any }>("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(eventId: string) {
    return this.request<{ success: boolean }>(`/api/events/${eventId}`, {
      method: "DELETE",
    });
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
