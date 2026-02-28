"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { MessageSquare, Send, ArrowLeft, Plus } from "lucide-react";

interface DMPanelProps {
  onClose: () => void;
  initialTargetUserId?: string | null;
}

export function DMPanel({ onClose, initialTargetUserId }: DMPanelProps) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [targetUsername, setTargetUsername] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // initialTargetUserId ile otomatik konuşma başlat
  useEffect(() => {
    if (!initialTargetUserId) return;
    (async () => {
      try {
        const res = await api.createConversation(initialTargetUserId);
        await loadConversations();
        const convRes = await api.getDMMessages(res.conversation.id);
        setActiveConv({ id: res.conversation.id });
        setMessages(convRes.messages);
      } catch (err: any) {
        console.error("Failed to start DM:", err);
      }
    })();
  }, [initialTargetUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket dinleme
  useEffect(() => {
    if (!activeConv) return;

    const socket = connectSocket();
    socket.emit("channel:join", `dm:${activeConv.id}`);

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("channel:leave", `dm:${activeConv.id}`);
      socket.off("message:new", handleNewMessage);
    };
  }, [activeConv?.id]);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.conversations);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const openConversation = async (conv: any) => {
    setActiveConv(conv);
    setLoading(true);
    try {
      const res = await api.getDMMessages(conv.id);
      setMessages(res.messages);
    } catch (err) {
      console.error("Failed to load DM messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv) return;
    const content = input.trim();
    setInput("");
    try {
      await api.sendDM(activeConv.id, content);
    } catch (err) {
      console.error("Failed to send DM:", err);
      setInput(content);
    }
  };

  const handleNewConversation = async () => {
    if (!targetUsername.trim()) return;
    try {
      // Kullanıcıyı bul (arama ile)
      // Basit çözüm: targetUserId olarak username gir, backend'de bul
      // Ama API targetUserId bekliyor. Önce arama yapalım.
      // Şimdilik targetUsername'i userId olarak kullan (geliştirme aşaması)
      const res = await api.createConversation(targetUsername.trim());
      setTargetUsername("");
      setShowNewDM(false);
      await loadConversations();
      // Yeni konuşmayı aç
      const convRes = await api.getDMMessages(res.conversation.id);
      setActiveConv({ id: res.conversation.id });
      setMessages(convRes.messages);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Aktif konuşma görünümü
  if (activeConv) {
    const otherUser = conversations.find((c) => c.id === activeConv.id)?.otherUser;

    return (
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-12 items-center gap-3 border-b border-surface-primary px-4">
          <button
            onClick={() => { setActiveConv(null); setMessages([]); }}
            className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue text-xs font-bold text-white">
            {otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="font-semibold text-sm">
            {otherUser?.displayName || "Kullanıcı"}
          </span>
        </div>

        {/* Mesajlar */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-text-muted">
              <p className="text-sm">Henüz mesaj yok. İlk mesajı gönderin!</p>
            </div>
          ) : (
            messages.map((msg) => (
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
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Mesaj girişi */}
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
              placeholder="Mesaj yazın..."
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

  // Konuşma listesi
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 items-center justify-between border-b border-surface-primary px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <h3 className="font-semibold">Direkt Mesajlar</h3>
        </div>
        <button
          onClick={() => setShowNewDM(!showNewDM)}
          className="rounded p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Yeni DM oluşturma */}
      {showNewDM && (
        <div className="border-b border-surface-overlay p-3">
          <p className="mb-2 text-xs text-text-muted">Kullanıcı ID'si girin:</p>
          <div className="flex gap-2">
            <input
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              placeholder="Kullanıcı ID"
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
              Başlat
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Henüz konuşma yok</p>
            <p className="text-xs mt-1">Bir üyeye tıklayarak DM başlatabilirsiniz</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-overlay transition"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue text-sm font-bold text-white">
                {conv.otherUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {conv.otherUser?.displayName || "Kullanıcı"}
                </p>
                {conv.lastMessage && (
                  <p className="truncate text-xs text-text-muted">
                    {conv.lastMessage.author?.displayName}: {conv.lastMessage.content}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
