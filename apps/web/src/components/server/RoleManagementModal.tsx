"use client";

import { useEffect, useState } from "react";
import { useServerStore } from "@/stores/server";
import { api } from "@/lib/api";
import { X, Plus, Trash2, Shield, ChevronRight } from "lucide-react";

// Permission tanımları (shared'daki bigint'leri string olarak temsil)
const PERMISSION_GROUPS = [
  {
    label: "Genel",
    permissions: [
      { key: 0, label: "Yönetici", desc: "Tüm yetkilere sahip olur" },
      { key: 1, label: "Sunucu Yönetimi", desc: "Sunucu ayarlarını düzenleyebilir" },
      { key: 2, label: "Kanal Yönetimi", desc: "Kanal oluşturma/düzenleme/silme" },
      { key: 3, label: "Rol Yönetimi", desc: "Rol oluşturma/düzenleme/atama" },
      { key: 4, label: "Davet Yönetimi", desc: "Davet kodlarını yönetme" },
    ],
  },
  {
    label: "Üyelik",
    permissions: [
      { key: 5, label: "Üye Atma", desc: "Üyeleri sunucudan atabilir" },
      { key: 6, label: "Üye Banlama", desc: "Üyeleri kalıcı olarak banlayabilir" },
      { key: 7, label: "Zaman Aşımı", desc: "Üyelere zaman aşımı uygulayabilir" },
    ],
  },
  {
    label: "Metin",
    permissions: [
      { key: 10, label: "Mesaj Gönderme", desc: "Metin kanallarına mesaj gönderebilir" },
      { key: 11, label: "Mesaj Okuma", desc: "Metin kanallarındaki mesajları görebilir" },
      { key: 12, label: "Mesaj Yönetimi", desc: "Başkalarının mesajlarını silebilir" },
      { key: 13, label: "Dosya Ekleme", desc: "Dosya ve görsel paylaşabilir" },
      { key: 15, label: "Reaksiyon Ekleme", desc: "Mesajlara emoji reaksiyonu ekleyebilir" },
      { key: 17, label: "Mesaj Sabitleme", desc: "Mesajları sabitleyebilir" },
    ],
  },
  {
    label: "Ses/Video",
    permissions: [
      { key: 20, label: "Bağlanma", desc: "Ses/video kanallarına katılabilir" },
      { key: 21, label: "Konuşma", desc: "Ses kanallarında konuşabilir" },
      { key: 22, label: "Video", desc: "Kamera açabilir" },
      { key: 23, label: "Ekran Paylaşımı", desc: "Ekranını paylaşabilir" },
      { key: 24, label: "Üye Susturma", desc: "Diğer üyeleri susturabilir" },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export function RoleManagementModal({ onClose }: Props) {
  const { activeServer, refreshActiveServer } = useServerStore();
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleName, setRoleName] = useState("");
  const [roleColor, setRoleColor] = useState("#99AAB5");
  const [rolePermissions, setRolePermissions] = useState(0n);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  useEffect(() => {
    if (activeServer) loadRoles();
  }, [activeServer?.id]);

  const loadRoles = async () => {
    if (!activeServer) return;
    try {
      const res = await api.getRoles(activeServer.id);
      setRoles(res.roles);
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  };

  const selectRole = (role: any) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleColor(role.color);
    setRolePermissions(BigInt(role.permissions));
  };

  const togglePermission = (bit: number) => {
    const mask = 1n << BigInt(bit);
    if ((rolePermissions & mask) !== 0n) {
      setRolePermissions(rolePermissions & ~mask);
    } else {
      setRolePermissions(rolePermissions | mask);
    }
  };

  const hasPermission = (bit: number) => {
    return (rolePermissions & (1n << BigInt(bit))) !== 0n;
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const data: any = { permissions: rolePermissions.toString() };
      if (!selectedRole.isDefault) {
        data.name = roleName;
        data.color = roleColor;
      }
      await api.updateRole(selectedRole.id, data);
      await loadRoles();
      await refreshActiveServer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newRoleName.trim() || !activeServer) return;
    try {
      const res = await api.createRole({
        serverId: activeServer.id,
        name: newRoleName.trim(),
      });
      await loadRoles();
      selectRole(res.role);
      setNewRoleName("");
      setCreating(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.isDefault) return;
    if (!confirm(`"${selectedRole.name}" rolünü silmek istediğinize emin misiniz?`)) return;
    try {
      await api.deleteRole(selectedRole.id);
      setSelectedRole(null);
      await loadRoles();
      await refreshActiveServer();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!activeServer) return null;

  const COLORS = ["#99AAB5", "#E74C3C", "#E67E22", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6", "#E91E63"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[80vh] w-full max-w-2xl rounded-xl bg-surface-secondary overflow-hidden">
        {/* Sol panel - rol listesi */}
        <div className="w-52 flex-shrink-0 border-r border-surface-primary bg-surface-primary/50 p-3 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-muted">ROLLER</h3>
            <button
              onClick={() => setCreating(true)}
              className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
            >
              <Plus size={16} />
            </button>
          </div>

          {creating && (
            <div className="mb-2">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Rol adı"
                className="w-full rounded bg-surface-primary px-2 py-1.5 text-xs text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setCreating(false); setNewRoleName(""); }
                }}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-0.5">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => selectRole(role)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  selectedRole?.id === role.id
                    ? "bg-surface-overlay text-text-primary"
                    : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
                }`}
              >
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: role.color }}
                />
                <span className="truncate">{role.name}</span>
                {role.isDefault && (
                  <span className="ml-auto text-[10px] text-text-muted">@</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Sağ panel - rol detay */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-primary px-5 py-3">
            <h2 className="text-lg font-bold">
              {selectedRole ? (
                <span className="flex items-center gap-2">
                  <Shield size={20} />
                  {selectedRole.isDefault ? "@everyone" : selectedRole.name}
                </span>
              ) : (
                "Rol Yönetimi"
              )}
            </h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          {selectedRole ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Rol adı ve renk */}
              {!selectedRole.isDefault && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                      Rol Adı
                    </label>
                    <input
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="w-full rounded-lg bg-surface-primary px-3 py-2 text-sm text-text-primary outline-none ring-1 ring-surface-overlay focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-text-muted">
                      Renk
                    </label>
                    <div className="flex gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setRoleColor(c)}
                          className={`h-7 w-7 rounded-full transition ${
                            roleColor === c ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-secondary" : ""
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* İzinler */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-text-primary">İzinler</h3>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label} className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase text-text-muted">
                      {group.label}
                    </h4>
                    <div className="space-y-1">
                      {group.permissions.map((perm) => (
                        <label
                          key={perm.key}
                          className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-overlay/50 cursor-pointer"
                        >
                          <div>
                            <p className="text-sm text-text-primary">{perm.label}</p>
                            <p className="text-xs text-text-muted">{perm.desc}</p>
                          </div>
                          <div
                            onClick={() => togglePermission(perm.key)}
                            className={`h-5 w-9 rounded-full transition cursor-pointer flex items-center ${
                              hasPermission(perm.key) ? "bg-accent-green" : "bg-surface-overlay"
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                hasPermission(perm.key) ? "translate-x-[18px]" : "translate-x-[2px]"
                              }`}
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Kaydet / Sil */}
              <div className="flex items-center gap-3 border-t border-surface-overlay pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-brand px-6 py-2 text-sm font-semibold text-surface-primary hover:bg-brand-dark disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                {!selectedRole.isDefault && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-accent-red hover:bg-accent-red/10"
                  >
                    <Trash2 size={14} />
                    Sil
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-text-muted">
              <div className="text-center">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p>Düzenlemek için bir rol seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
