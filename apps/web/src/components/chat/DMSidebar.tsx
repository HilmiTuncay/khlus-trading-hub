"use client";

import { useEffect, useState } from "react";
import { useDMStore } from "@/stores/dm";
import { useAuthStore } from "@/stores/auth";
import { useVoiceStore } from "@/stores/voice";
import { useThemeStore } from "@/stores/theme";
import { useUnreadStore } from "@/stores/unread";
import { VoiceConnectionPanel } from "@/components/voice/VoiceConnectionPanel";
import { MessageSquare, Plus, LogOut, Sun, Moon } from "lucide-react";
import clsx from "clsx";

export function DMSidebar() {
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const {
    conversations,
    activeConversation,
    loadConversations,
    openConversation,
    createNewConversation,
  } = useDMStore();
  const [showNewDM, setShowNewDM] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewConversation = async () => {
    if (!targetUsername.trim()) return;
    await createNewConversation(targetUsername.trim());
    setTargetUsername("");
    setShowNewDM(false);
  };

  return (
    <div className="flex h-full w-60 flex-col bg-surface-secondary">
      {/* Baslik */}
      <div className="flex h-12 items-center justify-between border-b border-surface-primary px-4">
        <h3 className="font-semibold">Direkt Mesajlar</h3>
        <button
          onClick={() => setShowNewDM(!showNewDM)}
          className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Yeni DM olusturma */}
      {showNewDM && (
        <div className="border-b border-surface-overlay p-3">
          <p className="mb-2 text-xs text-text-muted">Kullanici ID&apos;si girin:</p>
          <div className="flex gap-2">
            <input
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Kullanici ID"
              className="flex-1 rounded-lg bg-surface-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewConversation();
              }}
              autoFocus
            />
            <button
              onClick={handleNewConversation}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface-primary hover:bg-brand-dark"
            >
              Baslat
            </button>
          </div>
        </div>
      )}

      {/* Konusma listesi */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Henuz konusma yok</p>
            <p className="text-xs mt-1">Bir uyeye tiklayarak DM baslatin</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const unreadCount = useUnreadStore.getState().dms[conv.id] || 0;
            const isActive = activeConversation?.id === conv.id;
            const hasUnread = unreadCount > 0 && !isActive;

            return (
              <DMConversationItem
                key={conv.id}
                conv={conv}
                isActive={isActive}
                hasUnread={hasUnread}
                unreadCount={unreadCount}
                onClick={() => { openConversation(conv); useUnreadStore.getState().reset("dm", conv.id); }}
              />
            );
          })
        )}
      </div>

      {/* Ses baglanti paneli */}
      <VoiceConnectionPanelWrapper />

      {/* Kullanici paneli */}
      <UserPanel />
    </div>
  );
}

function DMConversationItem({
  conv,
  isActive,
  hasUnread: _hasUnread,
  unreadCount: _unreadCount,
  onClick,
}: {
  conv: any;
  isActive: boolean;
  hasUnread: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  // Reactive unread count from store
  const unreadCount = useUnreadStore((s) => s.dms[conv.id] || 0);
  const hasUnread = unreadCount > 0 && !isActive;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 px-4 py-3 transition",
        isActive
          ? "bg-surface-overlay"
          : hasUnread
          ? "bg-surface-overlay/50"
          : "hover:bg-surface-overlay"
      )}
    >
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue text-sm font-bold text-white">
          {conv.otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className={clsx("truncate text-sm text-text-primary", hasUnread ? "font-bold" : "font-semibold")}>
          {conv.otherUser?.displayName || "Kullanici"}
        </p>
        {conv.lastMessage && (
          <p className={clsx("truncate text-xs", hasUnread ? "text-text-secondary font-semibold" : "text-text-muted")}>
            {conv.lastMessage.author?.displayName}: {conv.lastMessage.content}
          </p>
        )}
      </div>
    </button>
  );
}

function VoiceConnectionPanelWrapper() {
  const isConnected = useVoiceStore((s) => s.isConnected);
  if (!isConnected) return null;
  return <VoiceConnectionPanel />;
}

const STATUS_OPTIONS = [
  { value: "online", label: "Cevrimici", color: "bg-accent-green" },
  { value: "idle", label: "Bosta", color: "bg-accent-yellow" },
  { value: "dnd", label: "Rahatsiz Etmeyin", color: "bg-accent-red" },
  { value: "offline", label: "Gorunmez", color: "bg-text-muted" },
];

function UserPanel() {
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showPopup, setShowPopup] = useState(false);

  const handleStatusChange = async (status: string) => {
    try {
      await updateProfile({ status });
    } catch (err: any) {
      console.error("Failed to update status:", err);
    }
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === user?.status) || STATUS_OPTIONS[0];

  return (
    <div className="relative">
      {showPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopup(false)} />
          <div className="absolute bottom-12 left-2 right-2 z-50 rounded-lg bg-surface-primary p-3 shadow-lg ring-1 ring-surface-overlay">
            <div className="mb-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-text-muted">Durum</p>
              <div className="space-y-0.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition",
                      user?.status === s.value
                        ? "bg-surface-overlay text-text-primary"
                        : "text-text-secondary hover:bg-surface-overlay/50"
                    )}
                  >
                    <div className={clsx("h-2.5 w-2.5 rounded-full", s.color)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-surface-overlay my-2" />

            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Aydinlik Tema" : "Karanlik Tema"}
            </button>

            <button
              onClick={() => { setShowPopup(false); logout(); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-accent-red hover:bg-surface-overlay"
            >
              <LogOut size={14} />
              Cikis Yap
            </button>
          </div>
        </>
      )}

      <button
        onClick={() => setShowPopup(!showPopup)}
        className="flex w-full items-center gap-2 border-t border-surface-primary bg-surface-primary/50 px-2 py-2 hover:bg-surface-overlay/50 transition"
      >
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-surface-primary">
            {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className={clsx("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-secondary", currentStatus.color)} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold">{user?.displayName}</p>
          <p className="truncate text-xs text-text-muted">{currentStatus.label}</p>
        </div>
      </button>
    </div>
  );
}
