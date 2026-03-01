"use client";

import { useEffect, useState } from "react";
import { useServerStore } from "@/stores/server";
import { Plus, LogIn, MessageSquare } from "lucide-react";
import clsx from "clsx";

export function ServerSidebar() {
  const { servers, activeServer, loadServers, setActiveServer, createServer, joinServer, isDMMode, setDMMode } =
    useServerStore();
  const [showModal, setShowModal] = useState<"create" | "join" | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    const server = await createServer(inputValue.trim());
    setActiveServer(server.id);
    setShowModal(null);
    setInputValue("");
  };

  const handleJoin = async () => {
    if (!inputValue.trim()) return;
    try {
      const server = await joinServer(inputValue.trim());
      setActiveServer(server.id);
      setShowModal(null);
      setInputValue("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-full w-[72px] flex-col items-center gap-2 bg-surface-primary py-3">
      {/* DM button */}
      <button
        onClick={() => setDMMode(true)}
        className={clsx(
          "relative flex h-12 w-12 items-center justify-center rounded-[24px] bg-surface-elevated text-text-primary transition-all hover:rounded-[16px] hover:bg-accent-blue hover:text-white",
          isDMMode && "rounded-[16px] bg-accent-blue text-white"
        )}
        title="Direkt Mesajlar"
      >
        {isDMMode && (
          <div className="absolute left-0 h-10 w-1 -translate-x-[20px] rounded-r-full bg-text-primary" />
        )}
        <MessageSquare size={22} />
      </button>

      {/* Divider */}
      <div className="mx-auto h-0.5 w-8 rounded-full bg-surface-overlay" />

      {/* Server list */}
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => setActiveServer(server.id)}
          className={clsx(
            "group relative flex h-12 w-12 items-center justify-center rounded-[24px] bg-surface-elevated text-text-primary transition-all hover:rounded-[16px] hover:bg-brand",
            !isDMMode && activeServer?.id === server.id && "rounded-[16px] bg-brand"
          )}
          title={server.name}
        >
          {/* Active indicator */}
          {!isDMMode && activeServer?.id === server.id && (
            <div className="absolute left-0 h-10 w-1 -translate-x-[20px] rounded-r-full bg-text-primary" />
          )}
          <span className="text-sm font-bold">
            {server.name.charAt(0).toUpperCase()}
          </span>
        </button>
      ))}

      {/* Divider */}
      <div className="mx-auto h-0.5 w-8 rounded-full bg-surface-overlay" />

      {/* Create server */}
      <button
        onClick={() => setShowModal("create")}
        className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-surface-elevated text-accent-green transition-all hover:rounded-[16px] hover:bg-accent-green hover:text-white"
        title="Sunucu Oluştur"
      >
        <Plus size={24} />
      </button>

      {/* Join server */}
      <button
        onClick={() => setShowModal("join")}
        className="flex h-12 w-12 items-center justify-center rounded-[24px] bg-surface-elevated text-accent-blue transition-all hover:rounded-[16px] hover:bg-accent-blue hover:text-white"
        title="Sunucuya Katıl"
      >
        <LogIn size={20} />
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-surface-secondary p-6">
            <h2 className="mb-4 text-xl font-bold">
              {showModal === "create" ? "Sunucu Oluştur" : "Sunucuya Katıl"}
            </h2>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                showModal === "create" ? "Sunucu adı" : "Davet kodu"
              }
              className="mb-4 w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  showModal === "create" ? handleCreate() : handleJoin();
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowModal(null);
                  setInputValue("");
                }}
                className="flex-1 rounded-lg bg-surface-overlay px-4 py-2 text-text-secondary hover:bg-surface-elevated"
              >
                İptal
              </button>
              <button
                onClick={showModal === "create" ? handleCreate : handleJoin}
                className="flex-1 rounded-lg bg-brand px-4 py-2 font-semibold text-surface-primary hover:bg-brand-dark"
              >
                {showModal === "create" ? "Oluştur" : "Katıl"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
