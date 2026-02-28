"use client";

import { useEffect, useRef, useState } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { Hash, Send, Paperclip, X, FileText, Image as ImageIcon, SmilePlus, Search } from "lucide-react";
import { MediaRoom } from "@/components/voice/MediaRoom";
import { ChannelVoicePanel } from "@/components/voice/ChannelVoicePanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function ChatArea() {
  const { activeChannel, activeServer } = useServerStore();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [inVoiceRoom, setInVoiceRoom] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevChannelRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice room durumunu kanal değiştiğinde sıfırla
  useEffect(() => {
    setInVoiceRoom(false);
  }, [activeChannel?.id]);

  // Mesajları yükle (sadece text kanalı)
  useEffect(() => {
    if (!activeChannel || activeChannel.type !== "text") return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await api.getMessages(activeChannel.id);
        setMessages(res.messages);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Socket: kanala katıl
    const socket = connectSocket();

    if (prevChannelRef.current) {
      socket.emit("channel:leave", prevChannelRef.current);
    }
    socket.emit("channel:join", activeChannel.id);
    prevChannelRef.current = activeChannel.id;

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleDeleteMessage = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleUpdateMessage = (data: { id: string; reactions?: Record<string, string[]> }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, ...data } : m))
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:delete", handleDeleteMessage);
    socket.on("message:update", handleUpdateMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delete", handleDeleteMessage);
      socket.off("message:update", handleUpdateMessage);
    };
  }, [activeChannel]);

  // Otomatik kaydırma
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || !activeChannel) return;
    const content = input.trim();
    setInput("");

    try {
      let attachments: any[] = [];

      if (pendingFiles.length > 0) {
        setUploading(true);
        const res = await api.uploadFiles(pendingFiles);
        attachments = res.attachments;
        setPendingFiles([]);
        setUploading(false);
      }

      await api.sendMessage(activeChannel.id, content, attachments.length > 0 ? attachments : undefined);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(content);
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Kanal seçilmemiş
  if (!activeChannel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-text-muted">
          <Hash size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Bir kanal seçin</p>
        </div>
      </div>
    );
  }

  // Ses / Video kanalı
  if (activeChannel.type === "voice" || activeChannel.type === "video") {
    if (inVoiceRoom) {
      return (
        <MediaRoom
          channelId={activeChannel.id}
          channelName={activeChannel.name}
          channelType={activeChannel.type}
          onDisconnect={() => setInVoiceRoom(false)}
        />
      );
    }

    return (
      <ChannelVoicePanel
        channelId={activeChannel.id}
        channelName={activeChannel.name}
        channelType={activeChannel.type}
        onJoin={() => setInVoiceRoom(true)}
      />
    );
  }

  // Text kanalı
  return (
    <div className="flex flex-1 flex-col">
      {/* Kanal başlığı */}
      <div className="flex h-12 items-center border-b border-surface-primary px-4">
        <Hash size={20} className="mr-2 text-text-muted" />
        <h3 className="font-semibold">{activeChannel.name}</h3>
        {activeChannel.topic && (
          <>
            <div className="mx-3 h-6 w-px bg-surface-overlay" />
            <p className="hidden sm:block truncate text-sm text-text-muted flex-1">
              {activeChannel.topic}
            </p>
          </>
        )}
        <div className="ml-auto flex items-center">
          {showSearch ? (
            <div className="flex items-center gap-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && searchQuery.trim() && activeServer) {
                    setSearching(true);
                    try {
                      const res = await api.search(searchQuery.trim(), activeServer.id);
                      setSearchResults(res);
                    } catch (err) {
                      console.error("Search failed:", err);
                    } finally {
                      setSearching(false);
                    }
                  }
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                    setSearchResults(null);
                  }
                }}
                placeholder="Mesaj ara..."
                className="w-40 rounded-md bg-surface-elevated px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
                autoFocus
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults(null); }}
                className="rounded p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
            >
              <Search size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Arama sonuçları */}
      {searchResults && (
        <div className="border-b border-surface-overlay bg-surface-secondary p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted uppercase">Arama Sonuçları</p>
            <button onClick={() => setSearchResults(null)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
          {searching && <p className="text-xs text-text-muted">Aranıyor...</p>}
          {searchResults.messages?.length === 0 && searchResults.members?.length === 0 && (
            <p className="text-xs text-text-muted">Sonuç bulunamadı</p>
          )}
          {searchResults.messages?.map((msg: any) => (
            <div key={msg.id} className="mb-2 rounded-md bg-surface-primary p-2">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold text-text-primary">{msg.author?.displayName}</span>
                <span className="text-[10px] text-text-muted">#{msg.channel?.name}</span>
                <span className="text-[10px] text-text-muted">{new Date(msg.createdAt).toLocaleDateString("tr-TR")}</span>
              </div>
              <p className="text-xs text-text-secondary break-words">{msg.content}</p>
            </div>
          ))}
          {searchResults.members?.map((m: any) => (
            <div key={m.id} className="flex items-center gap-2 rounded-md bg-surface-primary p-2 mb-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-surface-primary">
                {m.user?.displayName?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-xs text-text-primary">{m.user?.displayName}</span>
              <span className="text-[10px] text-text-muted">@{m.user?.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <p className="text-lg font-semibold">
              #{activeChannel.name} kanalına hoş geldiniz!
            </p>
            <p className="mt-1 text-sm">İlk mesajı siz gönderin.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              userId={user?.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 border-t border-surface-overlay px-4 py-2">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="relative flex items-center gap-2 rounded-lg bg-surface-overlay px-3 py-2"
            >
              {file.type.startsWith("image/") ? (
                <ImageIcon size={16} className="text-accent-blue" />
              ) : (
                <FileText size={16} className="text-text-muted" />
              )}
              <span className="max-w-[120px] truncate text-xs text-text-secondary">
                {file.name}
              </span>
              <button
                onClick={() => removePendingFile(i)}
                className="rounded-full p-0.5 text-text-muted hover:bg-surface-primary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mesaj girişi */}
      <div className="px-4 pb-4">
        <div className="flex items-center rounded-lg bg-surface-elevated px-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mr-2 rounded-md p-2 text-text-muted transition hover:text-text-primary"
            title="Dosya Ekle"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.mp4,.webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`#${activeChannel.name} kanalına mesaj gönderin`}
            className="flex-1 bg-transparent py-3 text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && pendingFiles.length === 0) || uploading}
            className="ml-2 rounded-md p-2 text-text-muted transition hover:text-brand disabled:opacity-30"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "🎯", "💯", "🚀"];

function MessageItem({ msg, userId }: { msg: any; userId?: string }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleReaction = async (emoji: string) => {
    try {
      await api.toggleReaction(msg.id, emoji);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const reactions: Record<string, string[]> = msg.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className="group relative mb-4 flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-surface-primary">
        {msg.author?.displayName?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-text-primary">
            {msg.author?.displayName || "Bilinmeyen"}
          </span>
          <span className="text-xs text-text-muted">
            {new Date(msg.createdAt).toLocaleString("tr-TR")}
          </span>
        </div>
        {msg.content && (
          <p className="text-text-secondary break-words">{msg.content}</p>
        )}
        {/* Attachments */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.attachments.map((att: any) => (
              <AttachmentPreview key={att.id} attachment={att} />
            ))}
          </div>
        )}
        {/* Reactions */}
        {hasReactions && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {Object.entries(reactions).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                  userIds.includes(userId || "")
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-surface-overlay bg-surface-overlay text-text-secondary hover:border-brand/30"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{userIds.length}</span>
              </button>
            ))}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center rounded-full border border-surface-overlay bg-surface-overlay px-2 py-0.5 text-xs text-text-muted hover:border-brand/30 hover:text-text-secondary transition"
            >
              <SmilePlus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute -top-2 right-0 hidden group-hover:flex items-center gap-0.5 rounded-md bg-surface-elevated shadow-sm ring-1 ring-surface-overlay px-1 py-0.5">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-surface-overlay transition"
          title="Reaksiyon Ekle"
        >
          <SmilePlus size={16} />
        </button>
      </div>

      {/* Emoji picker popup */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute right-0 top-0 z-50 rounded-lg bg-surface-primary p-2 shadow-lg ring-1 ring-surface-overlay">
            <div className="flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="rounded p-1.5 text-lg hover:bg-surface-overlay transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: any }) {
  const isImage = attachment.contentType?.startsWith("image/");
  const url = attachment.url.startsWith("http") ? attachment.url : `${API_URL}${attachment.url}`;

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={attachment.filename}
          className="max-h-60 max-w-xs rounded-lg border border-surface-overlay object-cover hover:brightness-110 transition"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-surface-overlay bg-surface-overlay px-3 py-2 hover:bg-surface-elevated transition"
    >
      <FileText size={20} className="text-accent-blue" />
      <div className="min-w-0">
        <p className="truncate text-sm text-text-primary">{attachment.filename}</p>
        <p className="text-xs text-text-muted">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </a>
  );
}
