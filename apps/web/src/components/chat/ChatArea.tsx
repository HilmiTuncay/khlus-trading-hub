"use client";

import { useEffect, useRef, useState } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { Hash, Send } from "lucide-react";

export function ChatArea() {
  const { activeChannel } = useServerStore();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevChannelRef = useRef<string | null>(null);

  // Load messages when channel changes
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

    // Socket: join channel
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

    socket.on("message:new", handleNewMessage);
    socket.on("message:delete", handleDeleteMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delete", handleDeleteMessage);
    };
  }, [activeChannel]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeChannel) return;
    const content = input.trim();
    setInput("");
    try {
      await api.sendMessage(activeChannel.id, content);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(content);
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-text-muted">
          <Hash size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Bir kanal secin</p>
        </div>
      </div>
    );
  }

  if (activeChannel.type !== "text") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-text-muted">
          <p className="text-lg">Ses/Video kanali</p>
          <p className="mt-2 text-sm">Katilmak icin kanala tiklayin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Channel header */}
      <div className="flex h-12 items-center border-b border-surface-primary px-4">
        <Hash size={20} className="mr-2 text-text-muted" />
        <h3 className="font-semibold">{activeChannel.name}</h3>
        {activeChannel.topic && (
          <>
            <div className="mx-3 h-6 w-px bg-surface-overlay" />
            <p className="truncate text-sm text-text-muted">
              {activeChannel.topic}
            </p>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            <p className="text-lg font-semibold">
              #{activeChannel.name} kanalina hos geldiniz!
            </p>
            <p className="mt-1 text-sm">Ilk mesaji siz gonderin.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group mb-4 flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-surface-primary">
                {msg.author?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-text-primary">
                    {msg.author?.displayName || "Bilinmeyen"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(msg.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-text-secondary break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
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
            placeholder={`#${activeChannel.name} kanalina mesaj gonderin`}
            className="flex-1 bg-transparent py-3 text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="ml-2 rounded-md p-2 text-text-muted transition hover:text-brand disabled:opacity-30"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
