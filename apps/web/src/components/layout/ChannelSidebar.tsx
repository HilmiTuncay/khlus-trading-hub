"use client";

import { useState } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { useVoiceStore } from "@/stores/voice";
import { ServerSettingsModal } from "@/components/server/ServerSettingsModal";
import {
  Hash, Volume2, Video, ChevronDown, LogOut, Settings,
  UserPlus, Plus, MoreHorizontal, Pencil, Trash2, X, User, Sun, Moon,
} from "lucide-react";
import { useThemeStore } from "@/stores/theme";
import clsx from "clsx";

const channelIcons = {
  text: Hash,
  voice: Volume2,
  video: Video,
};

export function ChannelSidebar() {
  const {
    activeServer, activeChannel, setActiveChannel,
    createChannel, deleteChannel, createCategory, updateCategory, deleteCategory,
  } = useServerStore();
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState<string | null>(null); // categoryId or "none"
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice" | "video">("text");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ type: "channel" | "category"; id: string; x: number; y: number } | null>(null);

  if (!activeServer) {
    return (
      <div className="flex h-full w-60 flex-col bg-surface-secondary">
        <div className="flex h-12 items-center border-b border-surface-primary px-4">
          <span className="text-text-muted">Sunucu seçin</span>
        </div>
      </div>
    );
  }

  const categories = activeServer.categories || [];
  const channels = activeServer.channels || [];
  const isOwner = activeServer.ownerId === user?.id;

  const channelsByCategory = categories.map((cat: any) => ({
    ...cat,
    channels: channels.filter((ch: any) => ch.categoryId === cat.id),
  }));

  const uncategorized = channels.filter((ch: any) => !ch.categoryId);

  const handleCreateChannel = async (categoryId?: string) => {
    if (!newChannelName.trim()) return;
    try {
      await createChannel({
        serverId: activeServer.id,
        name: newChannelName.trim(),
        type: newChannelType,
        categoryId: categoryId || undefined,
      });
      setNewChannelName("");
      setNewChannelType("text");
      setShowCreateChannel(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(activeServer.id, newCategoryName.trim());
      setNewCategoryName("");
      setShowCreateCategory(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) return;
    try {
      await updateCategory(categoryId, editCategoryName.trim());
      setEditingCategory(null);
      setEditCategoryName("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Bu kanalı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteChannel(channelId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz? Kanallar kategorisiz kalacak.")) return;
    try {
      await deleteCategory(categoryId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-full w-60 flex-col bg-surface-secondary" onClick={() => setContextMenu(null)}>
      {/* Sunucu başlığı */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex h-12 w-full items-center border-b border-surface-primary px-4 hover:bg-surface-overlay transition"
        >
          <h2 className="flex-1 truncate text-left font-semibold">{activeServer.name}</h2>
          <ChevronDown
            size={16}
            className={clsx("text-text-secondary transition-transform", showDropdown && "rotate-180")}
          />
        </button>

        {/* Dropdown menu */}
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute left-2 right-2 top-12 z-50 rounded-lg bg-surface-primary p-1.5 shadow-lg ring-1 ring-surface-overlay">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigator.clipboard.writeText(activeServer.inviteCode);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-accent-blue hover:bg-surface-overlay"
              >
                <UserPlus size={16} />
                Davet Kodunu Kopyala
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCreateChannel("none");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  >
                    <Plus size={16} />
                    Kanal Oluştur
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCreateCategory(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  >
                    <Plus size={16} />
                    Kategori Oluştur
                  </button>
                  <div className="my-1 h-px bg-surface-overlay" />
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowSettings(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                  >
                    <Settings size={16} />
                    Sunucu Ayarları
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <ServerSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Kanal listesi */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {uncategorized.map((channel: any) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={activeChannel?.id === channel.id}
            onClick={() => setActiveChannel(channel)}
            isOwner={isOwner}
            onDelete={() => handleDeleteChannel(channel.id)}
            onContextMenu={(e) => {
              if (!isOwner) return;
              e.preventDefault();
              setContextMenu({ type: "channel", id: channel.id, x: e.clientX, y: e.clientY });
            }}
          />
        ))}

        {channelsByCategory.map((category: any) => (
          <div key={category.id} className="mb-2">
            <div
              className="group mb-0.5 flex items-center px-1 py-1"
              onContextMenu={(e) => {
                if (!isOwner) return;
                e.preventDefault();
                setContextMenu({ type: "category", id: category.id, x: e.clientX, y: e.clientY });
              }}
            >
              <ChevronDown size={10} className="mr-1 text-text-muted" />
              {editingCategory === category.id ? (
                <input
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  onBlur={() => handleEditCategory(category.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEditCategory(category.id);
                    if (e.key === "Escape") { setEditingCategory(null); setEditCategoryName(""); }
                  }}
                  className="flex-1 bg-transparent text-xs font-semibold uppercase text-text-muted outline-none ring-1 ring-brand rounded px-1"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-xs font-semibold uppercase text-text-muted">
                  {category.name}
                </span>
              )}
              {isOwner && editingCategory !== category.id && (
                <button
                  onClick={() => setShowCreateChannel(category.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-text-muted hover:text-text-primary transition"
                  title="Kanal Ekle"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* Inline kanal oluşturma (kategoriye) */}
            {showCreateChannel === category.id && (
              <CreateChannelInline
                onSubmit={() => handleCreateChannel(category.id)}
                onCancel={() => { setShowCreateChannel(null); setNewChannelName(""); setNewChannelType("text"); }}
                name={newChannelName}
                setName={setNewChannelName}
                type={newChannelType}
                setType={setNewChannelType}
              />
            )}

            {category.channels.map((channel: any) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannel?.id === channel.id}
                onClick={() => setActiveChannel(channel)}
                isOwner={isOwner}
                onDelete={() => handleDeleteChannel(channel.id)}
                onContextMenu={(e) => {
                  if (!isOwner) return;
                  e.preventDefault();
                  setContextMenu({ type: "channel", id: channel.id, x: e.clientX, y: e.clientY });
                }}
              />
            ))}
          </div>
        ))}

        {/* Inline kanal oluşturma (kategorisiz) */}
        {showCreateChannel === "none" && (
          <CreateChannelInline
            onSubmit={() => handleCreateChannel()}
            onCancel={() => { setShowCreateChannel(null); setNewChannelName(""); setNewChannelType("text"); }}
            name={newChannelName}
            setName={setNewChannelName}
            type={newChannelType}
            setType={setNewChannelType}
          />
        )}

        {/* Inline kategori oluşturma */}
        {showCreateCategory && (
          <div className="mb-2 rounded-md bg-surface-overlay p-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Kategori adı"
              className="w-full rounded bg-surface-primary px-2 py-1.5 text-xs text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategory();
                if (e.key === "Escape") { setShowCreateCategory(false); setNewCategoryName(""); }
              }}
            />
            <div className="mt-2 flex gap-1">
              <button onClick={() => { setShowCreateCategory(false); setNewCategoryName(""); }} className="flex-1 rounded bg-surface-primary px-2 py-1 text-xs text-text-muted hover:text-text-primary">İptal</button>
              <button onClick={handleCreateCategory} className="flex-1 rounded bg-brand px-2 py-1 text-xs font-semibold text-surface-primary hover:bg-brand-dark">Oluştur</button>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 rounded-lg bg-surface-primary p-1.5 shadow-lg ring-1 ring-surface-overlay"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === "channel" && (
              <button
                onClick={() => {
                  handleDeleteChannel(contextMenu.id);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-accent-red hover:bg-surface-overlay"
              >
                <Trash2 size={14} />
                Kanalı Sil
              </button>
            )}
            {contextMenu.type === "category" && (
              <>
                <button
                  onClick={() => {
                    const cat = categories.find((c: any) => c.id === contextMenu.id);
                    setEditingCategory(contextMenu.id);
                    setEditCategoryName(cat?.name || "");
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                >
                  <Pencil size={14} />
                  Düzenle
                </button>
                <button
                  onClick={() => {
                    setShowCreateChannel(contextMenu.id);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
                >
                  <Plus size={14} />
                  Kanal Ekle
                </button>
                <button
                  onClick={() => {
                    handleDeleteCategory(contextMenu.id);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-accent-red hover:bg-surface-overlay"
                >
                  <Trash2 size={14} />
                  Kategoriyi Sil
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Kullanıcı paneli */}
      <UserPanel />
    </div>
  );
}

function CreateChannelInline({
  onSubmit,
  onCancel,
  name,
  setName,
  type,
  setType,
}: {
  onSubmit: () => void;
  onCancel: () => void;
  name: string;
  setName: (v: string) => void;
  type: "text" | "voice" | "video";
  setType: (v: "text" | "voice" | "video") => void;
}) {
  return (
    <div className="mb-2 rounded-md bg-surface-overlay p-2">
      <div className="mb-2 flex gap-1">
        {(["text", "voice", "video"] as const).map((t) => {
          const Icon = channelIcons[t];
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition",
                type === t ? "bg-brand text-surface-primary" : "bg-surface-primary text-text-muted hover:text-text-primary"
              )}
            >
              <Icon size={12} />
              {t === "text" ? "Metin" : t === "voice" ? "Ses" : "Video"}
            </button>
          );
        })}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="kanal-adı"
        className="w-full rounded bg-surface-primary px-2 py-1.5 text-xs text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="mt-2 flex gap-1">
        <button onClick={onCancel} className="flex-1 rounded bg-surface-primary px-2 py-1 text-xs text-text-muted hover:text-text-primary">İptal</button>
        <button onClick={onSubmit} className="flex-1 rounded bg-brand px-2 py-1 text-xs font-semibold text-surface-primary hover:bg-brand-dark">Oluştur</button>
      </div>
    </div>
  );
}

function ChannelItem({
  channel,
  isActive,
  onClick,
  isOwner,
  onDelete,
  onContextMenu,
}: {
  channel: any;
  isActive: boolean;
  onClick: () => void;
  isOwner: boolean;
  onDelete: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const Icon = channelIcons[channel.type as keyof typeof channelIcons] || Hash;
  const isVoiceChannel = channel.type === "voice" || channel.type === "video";
  const channelUsers = useVoiceStore((s) => s.channelUsers[channel.id]);

  return (
    <div>
      <div
        className={clsx(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition cursor-pointer",
          isActive
            ? "bg-surface-overlay text-text-primary"
            : "text-text-muted hover:bg-surface-elevated hover:text-text-secondary"
        )}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        <Icon size={18} className="shrink-0 opacity-70" />
        <span className="flex-1 truncate">{channel.name}</span>
        {isVoiceChannel && channelUsers && channelUsers.length > 0 && (
          <span className="text-[10px] text-text-muted">
            {channelUsers.length}
          </span>
        )}
      </div>

      {/* Ses/video kanalında aktif üyeler */}
      {isVoiceChannel && channelUsers && channelUsers.length > 0 && (
        <div className="ml-6 space-y-0.5 pb-1">
          {channelUsers.map((u) => (
            <div
              key={u.userId}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
            >
              <div className="relative">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-overlay text-[9px] font-bold">
                  {u.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-surface-secondary bg-accent-green" />
              </div>
              <span className="truncate text-text-secondary">
                {u.displayName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "online", label: "Çevrimiçi", color: "bg-accent-green" },
  { value: "idle", label: "Boşta", color: "bg-accent-yellow" },
  { value: "dnd", label: "Rahatsız Etmeyin", color: "bg-accent-red" },
  { value: "offline", label: "Görünmez", color: "bg-text-muted" },
];

function UserPanel() {
  const { user, logout, updateProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showPopup, setShowPopup] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const handleStatusChange = async (status: string) => {
    try {
      await updateProfile({ status });
    } catch (err: any) {
      console.error("Failed to update status:", err);
    }
  };

  const handleNameSave = async () => {
    if (!nameInput.trim()) return;
    try {
      await updateProfile({ displayName: nameInput.trim() });
      setEditingName(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === user?.status) || STATUS_OPTIONS[0];

  return (
    <div className="relative">
      {showPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowPopup(false); setEditingName(false); }} />
          <div className="absolute bottom-12 left-2 right-2 z-50 rounded-lg bg-surface-primary p-3 shadow-lg ring-1 ring-surface-overlay">
            {/* Profil header */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-surface-primary">
                {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded bg-surface-secondary px-2 py-1 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    onBlur={handleNameSave}
                  />
                ) : (
                  <p
                    className="cursor-pointer truncate text-sm font-semibold hover:underline"
                    onClick={() => { setEditingName(true); setNameInput(user?.displayName || ""); }}
                  >
                    {user?.displayName}
                  </p>
                )}
                <p className="truncate text-xs text-text-muted">@{user?.username}</p>
              </div>
            </div>

            {/* Durum seçimi */}
            <div className="mb-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-text-muted">Durum</p>
              <div className="space-y-0.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition",
                      user?.status === s.value
                        ? "bg-surface-overlay text-text-primary"
                        : "text-text-secondary hover:bg-surface-overlay/50"
                    )}
                  >
                    <div className={clsx("h-2.5 w-2.5 rounded-full", s.color)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-surface-overlay my-2" />

            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Aydınlık Tema" : "Karanlık Tema"}
            </button>

            <button
              onClick={() => { setShowPopup(false); logout(); }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-accent-red hover:bg-surface-overlay"
            >
              <LogOut size={14} />
              Çıkış Yap
            </button>
          </div>
        </>
      )}

      <button
        onClick={() => setShowPopup(!showPopup)}
        className="flex w-full items-center gap-2 border-t border-surface-primary bg-surface-primary/50 px-2 py-2 hover:bg-surface-overlay/50 transition"
      >
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-surface-primary">
            {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className={clsx("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-secondary", currentStatus.color)} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold">{user?.displayName}</p>
          <p className="truncate text-xs text-text-muted">{currentStatus.label}</p>
        </div>
      </button>
    </div>
  );
}
