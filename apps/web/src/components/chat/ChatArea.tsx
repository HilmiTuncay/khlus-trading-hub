"use client";

import { useEffect, useRef, useState, memo, useCallback } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { Hash, Send, Paperclip, X, FileText, Image as ImageIcon, SmilePlus, Search, Pin, Trash2, TrendingUp, TrendingDown, BarChart3, ListChecks } from "lucide-react";
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
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
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

  const loadPinnedMessages = async () => {
    if (!activeChannel) return;
    try {
      const res = await api.getPinnedMessages(activeChannel.id);
      setPinnedMessages(res.messages);
    } catch (err) {
      console.error("Failed to load pinned messages:", err);
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      await api.togglePin(messageId);
      if (showPinned) loadPinnedMessages();
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
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
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => {
              setShowPinned(!showPinned);
              if (!showPinned) loadPinnedMessages();
            }}
            className={`rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary ${showPinned ? "text-brand" : ""}`}
            title="Pinlenmiş Mesajlar"
          >
            <Pin size={18} />
          </button>
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

      {/* Pinlenmiş mesajlar paneli */}
      {showPinned && (
        <div className="border-b border-surface-overlay bg-surface-secondary p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-muted uppercase flex items-center gap-1">
              <Pin size={12} /> Pinlenmiş Mesajlar
            </p>
            <button onClick={() => setShowPinned(false)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
          {pinnedMessages.length === 0 ? (
            <p className="text-xs text-text-muted">Bu kanalda pinlenmiş mesaj yok.</p>
          ) : (
            pinnedMessages.map((msg: any) => (
              <div key={msg.id} className="mb-2 rounded-md bg-surface-primary p-2">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text-primary">{msg.author?.displayName}</span>
                  <span className="text-[10px] text-text-muted">{new Date(msg.createdAt).toLocaleDateString("tr-TR")}</span>
                  <button
                    onClick={() => handleTogglePin(msg.id)}
                    className="ml-auto text-[10px] text-accent-red hover:underline"
                  >
                    Pin Kaldır
                  </button>
                </div>
                <p className="text-xs text-text-secondary break-words">{msg.content}</p>
              </div>
            ))
          )}
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
              onPin={() => handleTogglePin(msg.id)}
              onDelete={async () => {
                try {
                  await api.deleteMessage(msg.id);
                } catch (err) {
                  console.error("Failed to delete:", err);
                }
              }}
              canDelete={msg.authorId === user?.id}
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

      {/* Sinyal formu */}
      {showSignalForm && activeChannel && (
        <SignalForm
          channelId={activeChannel.id}
          onClose={() => setShowSignalForm(false)}
        />
      )}

      {/* Anket formu */}
      {showPollForm && activeChannel && (
        <PollForm
          channelId={activeChannel.id}
          onClose={() => setShowPollForm(false)}
        />
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
          <button
            onClick={() => { setShowSignalForm(true); setShowPollForm(false); }}
            className="mr-2 rounded-md p-2 text-text-muted transition hover:text-brand"
            title="Trading Sinyali Gönder"
          >
            <BarChart3 size={20} />
          </button>
          <button
            onClick={() => { setShowPollForm(true); setShowSignalForm(false); }}
            className="mr-2 rounded-md p-2 text-text-muted transition hover:text-brand"
            title="Anket Oluştur"
          >
            <ListChecks size={20} />
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

const MessageItem = memo(function MessageItem({ msg, userId, onPin, onDelete, canDelete }: {
  msg: any;
  userId?: string;
  onPin?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
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
    <div className={`group relative mb-4 flex gap-3 ${msg.isPinned ? "border-l-2 border-brand pl-2" : ""}`}>
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
          {msg.isPinned && (
            <span className="flex items-center gap-0.5 text-[10px] text-brand">
              <Pin size={10} /> pinlendi
            </span>
          )}
        </div>
        {/* Sinyal kartı */}
        {msg.type === "signal" && msg.metadata ? (
          <SignalCard signal={msg.metadata} />
        ) : msg.type === "poll" && msg.metadata ? (
          <PollCard messageId={msg.id} poll={msg.metadata} userId={userId} />
        ) : msg.content ? (
          <MessageContent content={msg.content} />
        ) : null}
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
        {onPin && (
          <button
            onClick={onPin}
            className={`rounded p-1 hover:bg-surface-overlay transition ${msg.isPinned ? "text-brand" : "text-text-muted hover:text-text-primary"}`}
            title={msg.isPinned ? "Pin Kaldır" : "Pinle"}
          >
            <Pin size={16} />
          </button>
        )}
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="rounded p-1 text-text-muted hover:text-accent-red hover:bg-surface-overlay transition"
            title="Mesajı Sil"
          >
            <Trash2 size={16} />
          </button>
        )}
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
});

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

function SignalCard({ signal }: { signal: any }) {
  const isLong = signal.direction === "long";

  return (
    <div className={`mt-1 max-w-sm rounded-lg border-l-4 ${isLong ? "border-accent-green" : "border-accent-red"} bg-surface-overlay p-3`}>
      <div className="flex items-center gap-2 mb-2">
        {isLong ? (
          <TrendingUp size={18} className="text-accent-green" />
        ) : (
          <TrendingDown size={18} className="text-accent-red" />
        )}
        <span className={`text-sm font-bold ${isLong ? "text-accent-green" : "text-accent-red"}`}>
          {signal.direction.toUpperCase()}
        </span>
        <span className="text-sm font-bold text-text-primary">{signal.symbol}</span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Giriş:</span>
          <span className="font-semibold text-text-primary">{signal.entry}</span>
        </div>
        {signal.targets?.map((target: string, i: number) => (
          <div key={i} className="flex justify-between">
            <span className="text-text-muted">Hedef {i + 1}:</span>
            <span className="font-semibold text-accent-green">{target}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span className="text-text-muted">Stop Loss:</span>
          <span className="font-semibold text-accent-red">{signal.stopLoss}</span>
        </div>
      </div>

      {signal.notes && (
        <p className="mt-2 text-xs text-text-muted italic">{signal.notes}</p>
      )}
    </div>
  );
}

function SignalForm({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [targets, setTargets] = useState(["", ""]);
  const [stopLoss, setStopLoss] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!symbol.trim() || !entry.trim() || !stopLoss.trim()) return;
    const validTargets = targets.filter((t) => t.trim());
    if (validTargets.length === 0) return;

    setSending(true);
    try {
      await api.sendSignal({
        channelId,
        direction,
        symbol: symbol.trim().toUpperCase(),
        entry: entry.trim(),
        targets: validTargets,
        stopLoss: stopLoss.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-surface-overlay bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={16} className="text-brand" />
          Trading Sinyali Gönder
        </h4>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Yön */}
        <div className="col-span-2 flex gap-2">
          <button
            onClick={() => setDirection("long")}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold transition ${
              direction === "long" ? "bg-accent-green text-white" : "bg-surface-overlay text-text-muted hover:text-text-primary"
            }`}
          >
            <TrendingUp size={16} /> LONG
          </button>
          <button
            onClick={() => setDirection("short")}
            className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold transition ${
              direction === "short" ? "bg-accent-red text-white" : "bg-surface-overlay text-text-muted hover:text-text-primary"
            }`}
          >
            <TrendingDown size={16} /> SHORT
          </button>
        </div>

        {/* Sembol */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Sembol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="BTC/USDT"
            className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
          />
        </div>

        {/* Giriş */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Giriş Fiyatı</label>
          <input
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="45000"
            className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
          />
        </div>

        {/* Hedefler */}
        <div className="col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Hedefler</label>
          <div className="flex gap-2">
            {targets.map((t, i) => (
              <input
                key={i}
                value={t}
                onChange={(e) => {
                  const newTargets = [...targets];
                  newTargets[i] = e.target.value;
                  setTargets(newTargets);
                }}
                placeholder={`TP${i + 1}`}
                className="flex-1 rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              />
            ))}
            {targets.length < 5 && (
              <button
                onClick={() => setTargets([...targets, ""])}
                className="rounded-lg bg-surface-overlay px-3 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Stop Loss */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Stop Loss</label>
          <input
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="42000"
            className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
          />
        </div>

        {/* Not */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Not (opsiyonel)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Kısa açıklama"
            className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated"
        >
          İptal
        </button>
        <button
          onClick={handleSubmit}
          disabled={!symbol.trim() || !entry.trim() || !stopLoss.trim() || sending}
          className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface-primary hover:bg-brand-dark disabled:opacity-50"
        >
          {sending ? "Gönderiliyor..." : "Sinyal Gönder"}
        </button>
      </div>
    </div>
  );
}

function PollCard({ messageId, poll, userId }: { messageId: string; poll: any; userId?: string }) {
  const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0);

  const handleVote = async (index: number) => {
    try {
      await api.votePoll(messageId, index);
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  return (
    <div className="mt-1 max-w-sm rounded-lg bg-surface-overlay p-3">
      <p className="mb-2 text-sm font-semibold text-text-primary flex items-center gap-1.5">
        <ListChecks size={16} className="text-brand" />
        {poll.question}
      </p>
      <div className="space-y-1.5">
        {poll.options.map((opt: any, i: number) => {
          const voteCount = opt.votes?.length || 0;
          const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = opt.votes?.includes(userId);

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-xs transition ${
                hasVoted ? "border-brand" : "border-surface-primary hover:border-text-muted"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-brand/15 transition-all"
                style={{ width: `${percent}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className={`${hasVoted ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                  {opt.text}
                </span>
                <span className="text-[10px] text-text-muted font-medium">
                  {voteCount} ({percent}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-text-muted">{totalVotes} toplam oy</p>
    </div>
  );
}

function PollForm({ channelId, onClose }: { channelId: string; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!question.trim()) return;
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    setSending(true);
    try {
      await api.createPoll({ channelId, question: question.trim(), options: validOptions });
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-surface-overlay bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks size={16} className="text-brand" />
          Anket Oluştur
        </h4>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Soru</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Sorunuzu yazın..."
            className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-text-muted">Seçenekler</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setOptions(newOpts);
                  }}
                  placeholder={`Seçenek ${i + 1}`}
                  className="flex-1 rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="rounded-lg px-2 text-text-muted hover:text-accent-red"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              onClick={() => setOptions([...options, ""])}
              className="mt-2 text-xs text-brand hover:underline"
            >
              + Seçenek Ekle
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated"
        >
          İptal
        </button>
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || sending}
          className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface-primary hover:bg-brand-dark disabled:opacity-50"
        >
          {sending ? "Oluşturuluyor..." : "Anket Oluştur"}
        </button>
      </div>
    </div>
  );
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const TRADINGVIEW_REGEX = /tradingview\.com\/(?:chart|x)\/([^\s/]+)/;
const IMAGE_URL_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

function MessageContent({ content }: { content: string }) {
  const parts = content.split(URL_REGEX);
  const urls = content.match(URL_REGEX) || [];
  const imageUrls = urls.filter((u) => IMAGE_URL_REGEX.test(u));
  const tradingViewUrl = urls.find((u) => TRADINGVIEW_REGEX.test(u));

  return (
    <div>
      <p className="text-text-secondary break-words">
        {parts.map((part, i) =>
          URL_REGEX.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      {/* Görüntü URL'lerini inline göster */}
      {imageUrls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img
            src={url}
            alt="Paylaşılan görüntü"
            className="max-h-60 max-w-xs rounded-lg border border-surface-overlay object-cover hover:brightness-110 transition"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </a>
      ))}
      {/* TradingView embed */}
      {tradingViewUrl && (
        <div className="mt-2 rounded-lg border border-surface-overlay bg-surface-overlay p-2">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-brand" />
            <span className="text-xs font-semibold text-text-primary">TradingView Grafik</span>
          </div>
          <a
            href={tradingViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-blue hover:underline"
          >
            Grafiği TradingView&apos;da aç
          </a>
        </div>
      )}
    </div>
  );
}
