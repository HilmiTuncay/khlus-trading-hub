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

    const res = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload hatası" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async deleteMessage(messageId: string) {
    return this.request(`/api/messages/${messageId}`, { method: "DELETE" });
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

  // LiveKit
  async getLivekitToken(channelId: string) {
    return this.request<{ token: string; room: string; livekitUrl: string }>("/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({ channelId }),
    });
  }
}

export const api = new ApiClient();
