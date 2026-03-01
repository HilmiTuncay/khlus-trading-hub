"use client";

import { useState } from "react";
import { Volume2, Video, Monitor, Mic, VideoIcon, Loader2, AlertCircle } from "lucide-react";

interface ChannelVoicePanelProps {
  channelId: string;
  channelName: string;
  channelType: "voice" | "video";
  onJoin: () => Promise<void>;
}

export function ChannelVoicePanel({
  channelName,
  channelType,
  onJoin,
}: ChannelVoicePanelProps) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await onJoin();
    } catch (err: any) {
      setError(err.message || "Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-surface-secondary p-12">
        {/* İkon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated">
          {channelType === "video" ? (
            <Video size={36} className="text-brand" />
          ) : (
            <Volume2 size={36} className="text-brand" />
          )}
        </div>

        {/* Bilgi */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">{channelName}</h2>
          <p className="mt-2 text-text-secondary">
            {channelType === "video"
              ? "Video kanalına katılmak için aşağıdaki butona tıklayın"
              : "Ses kanalına katılmak için aşağıdaki butona tıklayın"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            50 kişiye kadar aynı anda bağlanabilir
          </p>
        </div>

        {/* Özellikler */}
        <div className="flex gap-6 text-sm text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Mic size={16} />
            <span>Ses</span>
          </div>
          {channelType === "video" && (
            <div className="flex items-center gap-1.5">
              <VideoIcon size={16} />
              <span>Full HD Video</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Monitor size={16} />
            <span>Ekran Paylaşımı</span>
          </div>
        </div>

        {/* Hata mesajı */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-accent-red/10 px-4 py-2 text-sm text-accent-red">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Katıl butonu */}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="flex items-center gap-2 rounded-xl bg-accent-green px-8 py-3 text-lg font-semibold text-white transition hover:bg-accent-green/80 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {joining ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Bağlanıyor...
            </>
          ) : (
            channelType === "video" ? "Video Kanalına Katıl" : "Ses Kanalına Katıl"
          )}
        </button>
      </div>
    </div>
  );
}
