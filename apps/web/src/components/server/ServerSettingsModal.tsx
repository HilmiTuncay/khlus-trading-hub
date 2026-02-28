"use client";

import { useState } from "react";
import { useServerStore } from "@/stores/server";
import { useAuthStore } from "@/stores/auth";
import { X, Copy, RefreshCw, Trash2, Check, Shield } from "lucide-react";
import { RoleManagementModal } from "./RoleManagementModal";

interface Props {
  onClose: () => void;
}

export function ServerSettingsModal({ onClose }: Props) {
  const { activeServer, updateServer, deleteServer, regenerateInviteCode } =
    useServerStore();
  const { user } = useAuthStore();

  const [name, setName] = useState(activeServer?.name || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  if (!activeServer) return null;

  const isOwner = activeServer.ownerId === user?.id;

  const handleSave = async () => {
    if (!name.trim() || name === activeServer.name) return;
    setSaving(true);
    try {
      await updateServer(activeServer.id, { name: name.trim() });
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInvite = async () => {
    const code = activeServer.inviteCode;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    try {
      await regenerateInviteCode(activeServer.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== activeServer.name) return;
    setDeleting(true);
    try {
      await deleteServer(activeServer.id);
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-surface-secondary p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Sunucu Ayarları</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sunucu Adı */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase text-text-muted">
            Sunucu Adı
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-surface-primary px-4 py-3 text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
            disabled={!isOwner}
          />
          {isOwner && name !== activeServer.name && name.trim() && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-surface-primary hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          )}
        </div>

        {/* Davet Kodu */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase text-text-muted">
            Davet Kodu
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-surface-primary px-4 py-3 font-mono text-sm text-text-primary ring-1 ring-surface-overlay">
              {activeServer.inviteCode}
            </div>
            <button
              onClick={handleCopyInvite}
              className="rounded-lg bg-surface-overlay p-3 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              title="Kopyala"
            >
              {copied ? <Check size={18} className="text-accent-green" /> : <Copy size={18} />}
            </button>
            {isOwner && (
              <button
                onClick={handleRegenerateInvite}
                className="rounded-lg bg-surface-overlay p-3 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                title="Yeni Kod Oluştur"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Sunucu Bilgileri */}
        <div className="mb-6 rounded-lg bg-surface-primary p-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Sahip</span>
            <span className="text-text-primary">
              {activeServer.members?.find((m: any) => m.userId === activeServer.ownerId)?.user?.displayName || "—"}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-text-muted">Üye Sayısı</span>
            <span className="text-text-primary">
              {activeServer.members?.length || activeServer._count?.members || 0}
            </span>
          </div>
        </div>

        {/* Rol Yönetimi */}
        {isOwner && (
          <div className="mb-6">
            <button
              onClick={() => setShowRoles(true)}
              className="flex w-full items-center gap-3 rounded-lg bg-surface-primary p-4 text-left hover:bg-surface-overlay transition"
            >
              <Shield size={20} className="text-brand" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Rol Yönetimi</p>
                <p className="text-xs text-text-muted">Rolleri oluştur, düzenle ve izinleri ayarla</p>
              </div>
            </button>
          </div>
        )}

        {showRoles && <RoleManagementModal onClose={() => setShowRoles(false)} />}

        {/* Sunucu Silme (sadece sahip) */}
        {isOwner && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm font-semibold text-accent-red hover:underline"
              >
                <Trash2 size={16} />
                Sunucuyu Sil
              </button>
            ) : (
              <div>
                <p className="mb-2 text-sm text-text-secondary">
                  Bu işlem geri alınamaz. Onaylamak için sunucu adını yazın:
                  <strong className="text-text-primary"> {activeServer.name}</strong>
                </p>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="Sunucu adını yazın"
                  className="mb-3 w-full rounded-lg bg-surface-primary px-4 py-2 text-sm text-text-primary outline-none ring-1 ring-accent-red/50 focus:ring-accent-red"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteInput("");
                    }}
                    className="flex-1 rounded-lg bg-surface-overlay px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteInput !== activeServer.name || deleting}
                    className="flex-1 rounded-lg bg-accent-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Siliniyor..." : "Sunucuyu Sil"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
