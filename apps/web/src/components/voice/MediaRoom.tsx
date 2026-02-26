"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Loader2 } from "lucide-react";

interface MediaRoomProps {
  channelId: string;
  channelName: string;
  channelType: "voice" | "video";
  onDisconnect: () => void;
}

export function MediaRoom({
  channelId,
  channelName,
  channelType,
  onDisconnect,
}: MediaRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await api.getLivekitToken(channelId);
        setToken(res.token);
        setLivekitUrl(res.livekitUrl);
      } catch (err: any) {
        setError(err.message || "Bağlantı hatası");
      }
    };
    getToken();
  }, [channelId]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="rounded-xl bg-surface-secondary p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-accent-red">
            Bağlantı Hatası
          </p>
          <p className="mb-4 text-sm text-text-secondary">{error}</p>
          <button
            onClick={onDisconnect}
            className="rounded-lg bg-surface-overlay px-4 py-2 text-sm hover:bg-surface-elevated"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (!token || !livekitUrl) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-text-secondary">Odaya bağlanılıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Oda başlığı */}
      <div className="flex h-12 items-center border-b border-surface-primary px-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-accent-green animate-pulse" />
          <h3 className="font-semibold">{channelName}</h3>
        </div>
        <span className="ml-3 text-xs text-text-muted">
          {channelType === "video" ? "Video Odası" : "Ses Odası"}
        </span>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 bg-surface-primary">
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          video={channelType === "video"}
          audio={true}
          onDisconnected={onDisconnect}
          data-lk-theme="default"
          style={{ height: "100%" }}
        >
          {channelType === "video" ? (
            <VideoConference />
          ) : (
            <VoiceRoom />
          )}
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}

function VoiceRoom() {
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div className="flex h-full flex-col">
      {/* Katılımcı grid */}
      <div className="flex-1 p-4">
        <GridLayout tracks={tracks} style={{ height: "calc(100% - 60px)" }}>
          <ParticipantTile />
        </GridLayout>
      </div>

      {/* Kontroller */}
      <ControlBar
        variation="minimal"
        controls={{
          microphone: true,
          camera: false,
          screenShare: true,
          leave: true,
        }}
      />
    </div>
  );
}
