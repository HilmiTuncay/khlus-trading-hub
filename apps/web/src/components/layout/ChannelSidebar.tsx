"use client";

import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { useVoiceStore } from "@/stores/voice";
import { Hash, Volume2, Video, ChevronDown, LogOut, Mic, MicOff } from "lucide-react";
import clsx from "clsx";

const channelIcons = {
  text: Hash,
  voice: Volume2,
  video: Video,
};

export function ChannelSidebar() {
  const { activeServer, activeChannel, setActiveChannel } = useServerStore();
  const { user, logout } = useAuthStore();

  if (!activeServer) {
    return (
      <div className="flex h-full w-60 flex-col bg-surface-secondary">
        <div className="flex h-12 items-center border-b border-surface-primary px-4">
          <span className="text-text-muted">Sunucu seçin</span>
        </div>
      </div>
    );
  }

  const categories = activeServer.categories || [];
  const channels = activeServer.channels || [];

  const channelsByCategory = categories.map((cat: any) => ({
    ...cat,
    channels: channels.filter((ch: any) => ch.categoryId === cat.id),
  }));

  const uncategorized = channels.filter((ch: any) => !ch.categoryId);

  return (
    <div className="flex h-full w-60 flex-col bg-surface-secondary">
      {/* Sunucu başlığı */}
      <div className="flex h-12 items-center border-b border-surface-primary px-4">
        <h2 className="flex-1 truncate font-semibold">{activeServer.name}</h2>
        <ChevronDown size={16} className="text-text-secondary" />
      </div>

      {/* Kanal listesi */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {uncategorized.map((channel: any) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={activeChannel?.id === channel.id}
            onClick={() => setActiveChannel(channel)}
          />
        ))}

        {channelsByCategory.map((category: any) => (
          <div key={category.id} className="mb-2">
            <div className="mb-0.5 flex items-center px-1 py-1">
              <ChevronDown size={10} className="mr-1 text-text-muted" />
              <span className="text-xs font-semibold uppercase text-text-muted">
                {category.name}
              </span>
            </div>
            {category.channels.map((channel: any) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannel?.id === channel.id}
                onClick={() => setActiveChannel(channel)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Kullanıcı paneli */}
      <div className="flex items-center gap-2 border-t border-surface-primary bg-surface-primary/50 px-2 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-surface-primary">
          {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{user?.displayName}</p>
          <p className="truncate text-xs text-text-muted">@{user?.username}</p>
        </div>
        <button
          onClick={logout}
          className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          title="Çıkış Yap"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
}: {
  channel: any;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = channelIcons[channel.type as keyof typeof channelIcons] || Hash;
  const participants = useVoiceStore((s) => s.participants[channel.id]);
  const isVoiceChannel = channel.type === "voice" || channel.type === "video";

  return (
    <div>
      <button
        onClick={onClick}
        className={clsx(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition",
          isActive
            ? "bg-surface-overlay text-text-primary"
            : "text-text-muted hover:bg-surface-elevated hover:text-text-secondary"
        )}
      >
        <Icon size={18} className="shrink-0 opacity-70" />
        <span className="truncate">{channel.name}</span>
      </button>

      {/* Ses/video kanalında aktif üyeler */}
      {isVoiceChannel && participants && participants.length > 0 && (
        <div className="ml-6 space-y-0.5 pb-1">
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
            >
              <div className="relative">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-overlay text-[9px] font-bold">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                {p.isSpeaking && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-surface-secondary bg-accent-green" />
                )}
              </div>
              <span
                className={clsx(
                  "truncate",
                  p.isSpeaking ? "text-accent-green font-medium" : "text-text-secondary"
                )}
              >
                {p.name}
              </span>
              {p.isMuted && (
                <MicOff size={10} className="shrink-0 text-accent-red/60" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
