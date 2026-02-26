"use client";

import { useState } from "react";
import { Volume2, Video, Monitor, PhoneOff, Mic, MicOff, VideoIcon, VideoOff } from "lucide-react";

interface ChannelVoicePanelProps {
  channelId: string;
  channelName: string;
  channelType: "voice" | "video";
  onJoin: () => void;
}

export function ChannelVoicePanel({
  channelName,
  channelType,
  onJoin,
}: ChannelVoicePanelProps) {
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

        {/* Katıl butonu */}
        <button
          onClick={onJoin}
          className="rounded-xl bg-accent-green px-8 py-3 text-lg font-semibold text-white transition hover:bg-accent-green/80"
        >
          {channelType === "video" ? "Video Kanalına Katıl" : "Ses Kanalına Katıl"}
        </button>
      </div>
    </div>
  );
}
