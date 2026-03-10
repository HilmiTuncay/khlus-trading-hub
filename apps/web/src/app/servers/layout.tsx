"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useServerStore } from "@/stores/server";
import { useVoiceStore } from "@/stores/voice";
import { useDMStore } from "@/stores/dm";
import { connectSocket, disconnectSocket, getSocket, setTokenGetter } from "@/lib/socket";
import { api } from "@/lib/api";
import { playNotificationSound } from "@/lib/notification";
import { useUnreadStore } from "@/stores/unread";
import { ServerSidebar } from "@/components/layout/ServerSidebar";
import { ChannelSidebar } from "@/components/layout/ChannelSidebar";
import { MemberSidebar } from "@/components/layout/MemberSidebar";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { DMSidebar } from "@/components/chat/DMSidebar";
import { DMChatArea } from "@/components/chat/DMChatArea";
import { ParticipantTracker } from "@/components/voice/MediaRoom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Menu, Users, RefreshCw, WifiOff } from "lucide-react";

export default function ServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, hasLoadedOnce, loadError, loadUser } = useAuthStore();
  const { activeServer, activeChannel, isDMMode, setDMMode } = useServerStore();
  const { isConnected, activeVoiceChannel, livekitToken, livekitUrl } = useVoiceStore();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    // Socket için token getter'ı bağla
    setTokenGetter(() => useAuthStore.getState().token);
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !user && !loadError) {
      router.replace("/auth/login");
    }
  }, [user, isLoading, loadError, router]);

  // Kanal degistiginde mobil sidebar'i kapat
  useEffect(() => {
    setShowSidebar(false);
  }, [activeChannel?.id]);

  const handleStartDM = (userId: string) => {
    setDMMode(true);
    useDMStore.getState().setTargetUserId(userId);
    setShowMembers(false);
  };

  // Socket baglantisi ve voice event dinleme + keep-alive
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();
    if (!socket) return;

    // Sunucuyu sıcak tut (Render uyku engelleyici)
    api.startKeepAlive();

    socket.on("voice:channel_users", (data: any) => {
      useVoiceStore.getState().setChannelUsers(data.channelId, data.users);
    });

    socket.on("voice:user_joined", (data: any) => {
      useVoiceStore.getState().addChannelUser(data.channelId, data.user);
    });

    socket.on("voice:user_left", (data: any) => {
      useVoiceStore.getState().removeChannelUser(data.channelId, data.userId);
    });

    // Bildirim sesi + okunmamis sayac: sadece aliciya, sadece aktif olmayan kanalda
    const handleNotification = (msg: any) => {
      const currentUser = useAuthStore.getState().user;
      const senderId = msg.authorId || msg.author?.id;
      if (!senderId || senderId === currentUser?.id) return;

      const { activeChannel, isDMMode } = useServerStore.getState();
      const { activeConversation } = useDMStore.getState();

      if (msg.conversationId) {
        // DM mesaji
        const isViewing = isDMMode && activeConversation?.id === msg.conversationId;
        if (!isViewing) {
          useUnreadStore.getState().increment("dm", msg.conversationId);
          playNotificationSound();
          if (!document.hasFocus()) {
            const senderName = msg.author?.displayName || msg.author?.username || "Birisi";
            const preview = msg.content?.length > 80 ? msg.content.slice(0, 80) + "..." : (msg.content || "Yeni mesaj");
            window.electronAPI?.showNotification(`${senderName} sana mesaj gonderdi`, preview);
          }
        }
      } else if (msg.channelId) {
        // Kanal mesaji
        const isViewing = !isDMMode && activeChannel?.id === msg.channelId;
        if (!isViewing) {
          useUnreadStore.getState().increment("channel", msg.channelId);
          playNotificationSound();
          if (!document.hasFocus()) {
            const senderName = msg.author?.displayName || msg.author?.username || "Birisi";
            const preview = msg.content?.length > 80 ? msg.content.slice(0, 80) + "..." : (msg.content || "Yeni mesaj");
            const serverState = useServerStore.getState();
            const ch = serverState.activeServer?.channels?.find((c: any) => c.id === msg.channelId);
            const channelName = ch?.name || "kanal";
            window.electronAPI?.showNotification(`${senderName} — #${channelName}`, preview);
          }
        }
      }
    };
    socket.on("message:new", handleNotification);

    return () => {
      api.stopKeepAlive();
      socket.off("voice:channel_users");
      socket.off("voice:user_joined");
      socket.off("voice:user_left");
      socket.off("message:new", handleNotification);
    };
  }, [user]);

  // Aktif sunucu degistiginde voice durumlarini iste
  useEffect(() => {
    if (!activeServer) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("voice:get_users", activeServer.id);
    }
  }, [activeServer?.id]);

  // Ilk yukleme — spinner goster (sadece hic yuklenmemisse)
  if (isLoading && !hasLoadedOnce) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  // Ilk yukleme hatasi — retry ekrani
  if (!user && loadError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <WifiOff size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
          <p className="text-lg font-semibold text-text-primary mb-2">Baglanti Hatasi</p>
          <p className="text-sm text-text-muted mb-4">{loadError}</p>
          <button
            onClick={() => loadUser()}
            className="flex items-center gap-2 mx-auto rounded-lg bg-brand px-6 py-3 font-semibold text-surface-primary hover:bg-brand-dark transition"
          >
            <RefreshCw size={18} />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const layoutContent = (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: her zaman goster. Mobil: toggle ile */}

      {/* Server + Channel Sidebar / DM Sidebar */}
      <div className="hidden md:flex">
        <ServerSidebar />
        {isDMMode ? <DMSidebar /> : <ChannelSidebar />}
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
            {isDMMode ? <DMSidebar /> : <ChannelSidebar />}
          </div>
        </>
      )}

      {/* Ana icerik */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobil ust bar */}
        <div className="flex h-12 items-center gap-2 border-b border-surface-primary px-2 md:hidden">
          <button
            onClick={() => setShowSidebar(true)}
            className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <Menu size={20} />
          </button>
          <span className="flex-1 truncate text-sm font-semibold">
            {isDMMode ? "Direkt Mesajlar" : (
              <>
                {activeServer?.name || "Khlus Trading Hub"}
                {activeChannel && (
                  <span className="text-text-muted font-normal"> / #{activeChannel.name}</span>
                )}
              </>
            )}
          </span>
          {!isDMMode && (
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
            >
              <Users size={20} />
            </button>
          )}
        </div>

        {isDMMode ? <DMChatArea /> : children}
      </div>

      {/* Member Sidebar: Desktop (DM modunda gizle) */}
      {!isDMMode && (
        <div className="hidden lg:flex">
          <MemberSidebar onStartDM={handleStartDM} />
        </div>
      )}

      {/* Mobil member sidebar overlay */}
      {showMembers && !isDMMode && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setShowMembers(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-full lg:hidden">
            <MemberSidebar onStartDM={handleStartDM} />
          </div>
        </>
      )}

      <ConnectionStatus />
    </div>
  );

  // Voice aktifse LiveKitRoom ile sar (context provider olarak)
  if (isConnected && livekitToken && livekitUrl && activeVoiceChannel) {
    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={true}
        video={false}
        audio={true}
        onDisconnected={() => useVoiceStore.getState().disconnectVoice()}
        onConnected={() => {
          useVoiceStore.getState().joinChannel(activeVoiceChannel.id);
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            getSocket()?.emit("voice:join", { channelId: activeVoiceChannel.id, userId });
          }
        }}
        onError={(error) => {
          console.error("LiveKit bağlantı hatası:", error);
          useVoiceStore.getState().disconnectVoice();
        }}
        style={{ display: "contents" }}
      >
        <RoomAudioRenderer />
        <ParticipantTracker channelId={activeVoiceChannel.id} />
        {layoutContent}
      </LiveKitRoom>
    );
  }

  return layoutContent;
}
