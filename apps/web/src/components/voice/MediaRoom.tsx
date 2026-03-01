"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  TrackRefContext,
  VideoTrack,
  AudioTrack,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Track,
  RoomEvent,
  Participant,
  LocalParticipant,
  RemoteTrackPublication,
} from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useVoiceStore } from "@/stores/voice";
import { ScreenShareModal, type ScreenShareOptions } from "./ScreenShareModal";

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
          <p className="mb-2 text-lg font-semibold text-accent-red">Bağlantı Hatası</p>
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
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={channelType === "video"}
        audio={true}
        onDisconnected={() => {
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            getSocket()?.emit("voice:leave", { channelId, userId });
          }
          useVoiceStore.getState().leaveChannel();
          onDisconnect();
        }}
        onConnected={() => {
          useVoiceStore.getState().joinChannel(channelId);
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            getSocket()?.emit("voice:join", { channelId, userId });
          }
        }}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <RoomContent
          channelName={channelName}
          channelType={channelType}
          onDisconnect={onDisconnect}
        />
        <RoomAudioRenderer />
        <ParticipantTracker channelId={channelId} />
      </LiveKitRoom>
    </div>
  );
}

// Kanal sidebar'da göstermek için katılımcıları takip et
export function ParticipantTracker({ channelId }: { channelId: string }) {
  const participants = useParticipants();
  const { setParticipants } = useVoiceStore();

  useEffect(() => {
    const list = participants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: p.isSpeaking,
      isMuted: p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true,
    }));
    setParticipants(channelId, list);
  }, [participants, channelId, setParticipants]);

  return null;
}

export function RoomContent({
  channelName,
  channelType,
  onDisconnect,
}: {
  channelName: string;
  channelType: "voice" | "video";
  onDisconnect: () => void;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [focusedTrack, setFocusedTrack] = useState<any>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(channelType === "video");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Ekran paylaşımı varsa otomatik odakla
  const screenShareTrack = useMemo(
    () => tracks.find((t) => t.source === Track.Source.ScreenShare),
    [tracks]
  );

  useEffect(() => {
    if (screenShareTrack) {
      setFocusedTrack(screenShareTrack);
    } else if (focusedTrack?.source === Track.Source.ScreenShare) {
      setFocusedTrack(null);
    }
  }, [screenShareTrack]);

  // Video trackları (kamera)
  const videoTracks = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Camera),
    [tracks]
  );

  // Küçük gösterilecek tracklar (focused hariç)
  const thumbnailTracks = useMemo(() => {
    if (!focusedTrack) return videoTracks;
    return videoTracks.filter(
      (t) =>
        !(
          t.participant.identity === focusedTrack.participant.identity &&
          t.source === focusedTrack.source
        )
    );
  }, [videoTracks, focusedTrack]);

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(!isMicOn);
    setIsMicOn(!isMicOn);
  };

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(!isCamOn);
    setIsCamOn(!isCamOn);
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    } else {
      setShowScreenShareModal(true);
    }
  };

  const startScreenShare = async (options: ScreenShareOptions) => {
    setShowScreenShareModal(false);
    try {
      const isSource = options.resolution.width === 0;
      await localParticipant.setScreenShareEnabled(true, {
        resolution: isSource ? undefined : {
          width: options.resolution.width,
          height: options.resolution.height,
          frameRate: options.frameRate,
        },
        contentHint: "detail",
      });
      setIsScreenSharing(true);
    } catch {
      // Kullanıcı iptal etti
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && videoContainerRef.current) {
      videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Fullscreen değişikliğini dinle (ESC ile çıkış vs.)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Ekran paylaşımı kalite modal */}
      {showScreenShareModal && (
        <ScreenShareModal
          onStart={startScreenShare}
          onCancel={() => setShowScreenShareModal(false)}
        />
      )}

      {/* Başlık */}
      <div className="flex h-12 items-center justify-between border-b border-surface-primary px-4">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-accent-green animate-pulse" />
          <h3 className="font-semibold">{channelName}</h3>
          <span className="text-xs text-text-muted">
            {channelType === "video" ? "Video Odası" : "Ses Odası"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Users size={16} />
          <span className="text-sm">{participants.length}</span>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-primary p-2">
        {focusedTrack ? (
          // === FOCUSED LAYOUT (Discord tarzı) ===
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {/* Büyük ekran */}
            <div
              ref={videoContainerRef}
              className={clsx(
                "relative flex-1 cursor-pointer overflow-hidden rounded-lg bg-black",
                isFullscreen && "flex flex-col"
              )}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
            >
              {focusedTrack.publication?.track ? (
                <VideoTrack
                  trackRef={focusedTrack}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <ParticipantPlaceholder name={focusedTrack.participant.name || focusedTrack.participant.identity} large />
              )}

              {/* Paylaşan kişi bilgisi */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-black/70 px-3 py-1.5">
                <span className="text-sm font-semibold text-white">
                  {focusedTrack.participant.name || focusedTrack.participant.identity}
                </span>
                {focusedTrack.source === Track.Source.ScreenShare && (
                  <span className="rounded bg-accent-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                    EKRAN
                  </span>
                )}
              </div>

              {/* Fullscreen ikonu */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="absolute right-3 top-3 rounded-md bg-black/50 p-2 text-white/70 hover:text-white"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              {/* Fullscreen içi kontroller */}
              {isFullscreen && (
                <>
                  {/* Alt kısımda thumbnail'lar */}
                  {thumbnailTracks.length > 0 && (
                    <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 px-4">
                      {thumbnailTracks.map((track) => (
                        <div
                          key={`fs-${track.participant.identity}-${track.source}`}
                          className="relative h-24 w-36 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-surface-elevated/80 hover:ring-2 hover:ring-brand"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedTrack(track);
                          }}
                        >
                          {track.publication?.track ? (
                            <VideoTrack
                              trackRef={track}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <ParticipantPlaceholder name={track.participant.name || track.participant.identity} />
                          )}
                          <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                            {track.participant.name || track.participant.identity}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fullscreen kontrol çubuğu */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 bg-black/70 py-3">
                    <ControlButton
                      icon={isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                      label={isMicOn ? "Sustur" : "Mikrofon Aç"}
                      active={isMicOn}
                      onClick={toggleMic}
                    />
                    {channelType === "video" && (
                      <ControlButton
                        icon={isCamOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                        label={isCamOn ? "Kamerayı Kapat" : "Kamerayı Aç"}
                        active={isCamOn}
                        onClick={toggleCam}
                      />
                    )}
                    <ControlButton
                      icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                      label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
                      active={isScreenSharing}
                      activeColor="text-accent-green"
                      onClick={toggleScreenShare}
                    />
                    <ControlButton
                      icon={<Minimize2 size={20} />}
                      label="Tam Ekrandan Çık"
                      onClick={toggleFullscreen}
                    />
                    <ControlButton
                      icon={<PhoneOff size={20} />}
                      label="Ayrıl"
                      danger
                      onClick={() => {
                        if (document.fullscreenElement) document.exitFullscreen();
                        useVoiceStore.getState().leaveChannel();
                        onDisconnect();
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Alt kısımda küçük thumbnail'lar */}
            {thumbnailTracks.length > 0 && (
              <div className="flex h-28 gap-2 overflow-x-auto">
                {thumbnailTracks.map((track) => (
                  <div
                    key={`${track.participant.identity}-${track.source}`}
                    className="relative h-full w-40 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-surface-elevated hover:ring-2 hover:ring-brand"
                    onClick={() => setFocusedTrack(track)}
                  >
                    {track.publication?.track ? (
                      <VideoTrack
                        trackRef={track}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <ParticipantPlaceholder name={track.participant.name || track.participant.identity} />
                    )}
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {track.participant.name || track.participant.identity}
                    </div>
                    {track.participant.isSpeaking && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-accent-green" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // === GRID LAYOUT (ekran paylaşımı yokken) ===
          <div
            className={clsx(
              "grid flex-1 gap-2 overflow-hidden",
              videoTracks.length <= 1 && "grid-cols-1",
              videoTracks.length === 2 && "grid-cols-2",
              videoTracks.length >= 3 && videoTracks.length <= 4 && "grid-cols-2",
              videoTracks.length >= 5 && videoTracks.length <= 9 && "grid-cols-3",
              videoTracks.length >= 10 && "grid-cols-4"
            )}
          >
            {videoTracks.map((track) => (
              <div
                key={`${track.participant.identity}-${track.source}`}
                className="relative cursor-pointer overflow-hidden rounded-lg bg-surface-elevated hover:ring-2 hover:ring-brand"
                onClick={() => setFocusedTrack(track)}
              >
                {track.publication?.track ? (
                  <VideoTrack
                    trackRef={track}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <ParticipantPlaceholder name={track.participant.name || track.participant.identity} large />
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1">
                  {track.participant.isSpeaking ? (
                    <Mic size={12} className="text-accent-green" />
                  ) : (
                    <MicOff size={12} className="text-text-muted" />
                  )}
                  <span className="text-xs font-medium text-white">
                    {track.participant.name || track.participant.identity}
                  </span>
                </div>
                {track.participant.isSpeaking && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-accent-green" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kontrol çubuğu */}
      <div className="flex items-center justify-center gap-3 border-t border-surface-primary bg-surface-secondary px-4 py-3">
        <ControlButton
          icon={isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          label={isMicOn ? "Sustur" : "Mikrofon Aç"}
          active={isMicOn}
          onClick={toggleMic}
        />
        {channelType === "video" && (
          <ControlButton
            icon={isCamOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
            label={isCamOn ? "Kamerayı Kapat" : "Kamerayı Aç"}
            active={isCamOn}
            onClick={toggleCam}
          />
        )}
        <ControlButton
          icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          label={isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
          active={isScreenSharing}
          activeColor="text-accent-green"
          onClick={toggleScreenShare}
        />
        <ControlButton
          icon={<PhoneOff size={20} />}
          label="Ayrıl"
          danger
          onClick={() => {
            useVoiceStore.getState().leaveChannel();
            onDisconnect();
          }}
        />
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  active,
  danger,
  activeColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={clsx(
        "flex h-11 w-11 items-center justify-center rounded-full transition",
        danger
          ? "bg-accent-red text-white hover:bg-accent-red/80"
          : active
          ? `bg-surface-overlay ${activeColor || "text-text-primary"} hover:bg-surface-elevated`
          : "bg-surface-overlay text-accent-red hover:bg-surface-elevated"
      )}
    >
      {icon}
    </button>
  );
}

function ParticipantPlaceholder({ name, large }: { name: string; large?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-elevated">
      <div
        className={clsx(
          "flex items-center justify-center rounded-full bg-brand font-bold text-surface-primary",
          large ? "h-20 w-20 text-3xl" : "h-10 w-10 text-sm"
        )}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}
