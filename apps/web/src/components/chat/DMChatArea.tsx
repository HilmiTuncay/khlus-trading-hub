"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDMStore } from "@/stores/dm";
import { useAuthStore } from "@/stores/auth";
import { connectSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";

export function DMChatArea() {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversation,
    targetUserId,
    messages,
    loading,
    setActiveConversation,
    setMessages,
    openConversation,
    createNewConversation,
    setTargetUserId,
    loadConversations,
  } = useDMStore();
  const [input, setInput] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingOlderRef = useRef(false);

  // targetUserId ile otomatik konusma baslat
  useEffect(() => {
    if (!targetUserId) return;
    createNewConversation(targetUserId);
  }, [targetUserId, createNewConversation]);

  // Konuşma değiştiğinde hasMore sıfırla
  useEffect(() => {
    setHasMore(true);
    isLoadingOlderRef.current = false;
  }, [activeConversation?.id]);

  // Eski mesajları yükle (infinite scroll)
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversation || !hasMore || loadingMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoadingMore(true);
    isLoadingOlderRef.current = true;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    try {
      const res = await api.getDMMessages(activeConversation.id, oldestMessage.id);
      setHasMore(res.hasMore ?? res.messages.length >= 50);
      if (res.messages.length > 0) {
        setMessages((prev: any[]) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = res.messages.filter((m: any) => !existingIds.has(m.id));
          return [...newMsgs, ...prev];
        });
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight;
          }
          isLoadingOlderRef.current = false;
        });
      } else {
        isLoadingOlderRef.current = false;
      }
    } catch (err) {
      console.error("Failed to load older DM messages:", err);
      isLoadingOlderRef.current = false;
    } finally {
      setLoadingMore(false);
    }
  }, [activeConversation, hasMore, loadingMore, messages, setMessages]);

  // Scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && hasMore && !loadingMore) {
        loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadOlderMessages]);

  // Otomatik kaydir (sadece yeni mesajlarda)
  useEffect(() => {
    if (!isLoadingOlderRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Socket dinleme
  useEffect(() => {
    if (!activeConversation) return;

    const socket = connectSocket();
    if (!socket) return;

    socket.emit("channel:join", `dm:${activeConversation.id}`);

    const handleNewMessage = (message: any) => {
      setMessages((prev: any[]) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleReconnect = async () => {
      socket.emit("channel:join", `dm:${activeConversation.id}`);
      try {
        const res = await api.getDMMessages(activeConversation.id);
        setMessages((prev: any[]) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = res.messages.filter((m: any) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      } catch {}
    };

    socket.on("message:new", handleNewMessage);
    socket.on("connect", handleReconnect);

    return () => {
      socket.emit("channel:leave", `dm:${activeConversation.id}`);
      socket.off("message:new", handleNewMessage);
      socket.off("connect", handleReconnect);
    };
  }, [activeConversation?.id, setMessages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;
    const content = input.trim();
    setInput("");
    try {
      const res = await api.sendDM(activeConversation.id, content);
      // API yanıtından direkt ekle — socket gecikmesini bekleme
      if (res.message) {
        setMessages((prev: any[]) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
      }
    } catch (err) {
      console.error("Failed to send DM:", err);
      setInput(content);
    }
  };

  // Konusma secilmemis
  if (!activeConversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-text-muted">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-semibold">Direkt Mesajlar</p>
          <p className="mt-1 text-sm">Soldaki listeden bir konusma secin</p>
        </div>
      </div>
    );
  }

  const otherUser = conversations.find((c) => c.id === activeConversation.id)?.otherUser;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-12 items-center gap-3 border-b border-surface-primary px-4">
        {/* Mobil geri butonu */}
        <button
          onClick={() => setActiveConversation(null)}
          className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary md:hidden"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue text-xs font-bold text-white">
          {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span className="font-semibold text-sm">
          {otherUser?.displayName || "Kullanici"}
        </span>
      </div>

      {/* Mesajlar */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <p className="text-sm">Henuz mesaj yok. Ilk mesaji gonderin!</p>
          </div>
        ) : (
          <>
          {loadingMore && (
            <div className="flex justify-center py-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          )}
          {!hasMore && messages.length > 0 && (
            <div className="text-center py-4 text-text-muted text-xs">Konusmanin basina ulastiniz</div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-3 flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-surface-primary">
                {msg.author?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    {msg.author?.displayName}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(msg.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-sm text-text-secondary break-words">{msg.content}</p>
              </div>
            </div>
          ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mesaj girisi */}
      <div className="px-4 pb-4">
        <div className="flex items-center rounded-lg bg-surface-elevated px-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Mesaj yazin..."
            className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ml-2 rounded-md p-2 text-text-muted transition hover:text-brand disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
