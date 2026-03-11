"use client";

import { useVoiceStore } from "@/stores/voice";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { useLocalParticipant } from "@livekit/components-react";
import { useState } from "react";

export function VoiceConnectionPanel() {
  const { activeVoiceChannel, disconnectVoice } = useVoiceStore();
  const { localParticipant } = useLocalParticipant();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(false);

  if (!activeVoiceChannel) return null;

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(!isCamOn);
    setIsCamOn(!isCamOn);
  };

  return (
    <div className="border-t border-surface-primary bg-surface-primary/50 px-2 py-2">
      {/* Baglanti bilgisi */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-accent-green">Ses Baglantisi</p>
          <p className="text-[10px] text-text-muted truncate">{activeVoiceChannel.name}</p>
        </div>
      </div>

      {/* Kontroller */}
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={toggleMic}
          title={isMicOn ? "Sustur" : "Mikrofon Ac"}
          className={`rounded-md p-2 transition ${
            isMicOn
              ? "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
              : "bg-accent-red/20 text-accent-red hover:bg-accent-red/30"
          }`}
        >
          {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {activeVoiceChannel.type === "video" && (
          <button
            onClick={toggleCam}
            title={isCamOn ? "Kamerayi Kapat" : "Kamerayi Ac"}
            className={`rounded-md p-2 transition ${
              isCamOn
                ? "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                : "bg-accent-red/20 text-accent-red hover:bg-accent-red/30"
            }`}
          >
            {isCamOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
          </button>
        )}

        <button
          onClick={() => disconnectVoice("Kullanici ayrildi")}
          title="Baglantiyi Kes"
          className="rounded-md bg-accent-red/20 p-2 text-accent-red hover:bg-accent-red/30 transition"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}
