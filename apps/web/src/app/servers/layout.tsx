"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useServerStore } from "@/stores/server";
import { useVoiceStore } from "@/stores/voice";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { ServerSidebar } from "@/components/layout/ServerSidebar";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
import { MemberSidebar } from "@/components/layout/MemberSidebar";
import { Menu, Users, X } from "lucide-react";

export default function ServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();
  const { activeServer, activeChannel } = useServerStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login");
    }
  }, [user, isLoading, router]);

  // Kanal değiştiğinde mobil sidebar'ı kapat
  useEffect(() => {
    setShowSidebar(false);
  }, [activeChannel?.id]);

  // Socket bağlantısı ve voice event dinleme
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    socket.on("voice:channel_users", (data) => {
      useVoiceStore.getState().setChannelUsers(data.channelId, data.users);
    });

    socket.on("voice:user_joined", (data) => {
      useVoiceStore.getState().addChannelUser(data.channelId, data.user);
    });

    socket.on("voice:user_left", (data) => {
      useVoiceStore.getState().removeChannelUser(data.channelId, data.userId);
    });

    return () => {
      socket.off("voice:channel_users");
      socket.off("voice:user_joined");
      socket.off("voice:user_left");
    };
  }, [user]);

  // Aktif sunucu değiştiğinde voice durumlarını iste
  useEffect(() => {
    if (!activeServer) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("voice:get_users", activeServer.id);
    }
  }, [activeServer?.id]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: her zaman göster. Mobil: toggle ile */}

      {/* Server + Channel Sidebar */}
      <div className="hidden md:flex">
        <ServerSidebar />
        <ChannelSidebar />
      </div>

      {/* Mobil sidebar overlay */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed left-0 top-0 z-50 flex h-full md:hidden">
            <ServerSidebar />
            <ChannelSidebar />
          </div>
        </>
      )}

      {/* Ana içerik */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobil üst bar */}
        <div className="flex h-12 items-center gap-2 border-b border-surface-primary px-2 md:hidden">
          <button
            onClick={() => setShowSidebar(true)}
            className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <Menu size={20} />
          </button>
          <span className="flex-1 truncate text-sm font-semibold">
            {activeServer?.name || "Khlus Trading Hub"}
            {activeChannel && (
              <span className="text-text-muted font-normal"> / #{activeChannel.name}</span>
            )}
          </span>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <Users size={20} />
          </button>
        </div>

        {children}
      </div>

      {/* Member Sidebar: Desktop */}
      <div className="hidden lg:flex">
        <MemberSidebar />
      </div>

      {/* Mobil member sidebar overlay */}
      {showMembers && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowMembers(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full lg:hidden">
            <MemberSidebar />
          </div>
        </>
      )}
    </div>
  );
}
