"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useServerStore } from "@/stores/server";
import { useVoiceStore } from "@/stores/voice";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { ServerSidebar } from "@/components/layout/ServerSidebar";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
import { MemberSidebar } from "@/components/layout/MemberSidebar";

export default function ServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, loadUser } = useAuthStore();
  const { activeServer } = useServerStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/login");
    }
  }, [user, isLoading, router]);

  // Socket bağlantısı ve voice event dinleme
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();
    const store = useVoiceStore.getState();

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
      <ServerSidebar />
      <ChannelSidebar />
      <div className="flex flex-1 flex-col">{children}</div>
      <MemberSidebar />
    </div>
  );
}
