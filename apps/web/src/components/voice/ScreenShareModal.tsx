"use client";

import { useState } from "react";
import { Monitor, X } from "lucide-react";
import clsx from "clsx";

interface ScreenShareModalProps {
  onStart: (options: ScreenShareOptions) => void;
  onCancel: () => void;
}

export interface ScreenShareOptions {
  resolution: { width: number; height: number };
  frameRate: number;
  label: string;
}

const RESOLUTIONS = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "Kaynak", width: 0, height: 0 },
];

const FRAME_RATES = [
  { label: "15 FPS", value: 15 },
  { label: "30 FPS", value: 30 },
  { label: "60 FPS", value: 60 },
];

export function ScreenShareModal({ onStart, onCancel }: ScreenShareModalProps) {
  const [selectedRes, setSelectedRes] = useState(1); // 1080p varsayılan
  const [selectedFps, setSelectedFps] = useState(1); // 30fps varsayılan

  const handleStart = () => {
    const res = RESOLUTIONS[selectedRes];
    const fps = FRAME_RATES[selectedFps];
    onStart({
      resolution: { width: res.width, height: res.height },
      frameRate: fps.value,
      label: `${res.label} ${fps.label}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-surface-secondary p-6 shadow-2xl">
        {/* Başlık */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue/20">
              <Monitor size={20} className="text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Ekran Paylaşımı</h2>
              <p className="text-sm text-text-muted">Kalite ayarlarını seçin</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Çözünürlük */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
            Çözünürlük
          </label>
          <div className="grid grid-cols-4 gap-2">
            {RESOLUTIONS.map((res, i) => (
              <button
                key={res.label}
                onClick={() => setSelectedRes(i)}
                className={clsx(
                  "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition",
                  selectedRes === i
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-surface-overlay bg-surface-primary text-text-secondary hover:border-text-muted"
                )}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frame Rate */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase text-text-secondary">
            Kare Hızı
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FRAME_RATES.map((fps, i) => (
              <button
                key={fps.value}
                onClick={() => setSelectedFps(i)}
                className={clsx(
                  "rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition",
                  selectedFps === i
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-surface-overlay bg-surface-primary text-text-secondary hover:border-text-muted"
                )}
              >
                {fps.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bilgi */}
        <div className="mb-6 rounded-lg bg-surface-primary p-3 text-xs text-text-muted">
          Yüksek çözünürlük ve kare hızı daha fazla bant genişliği kullanır.
          Bağlantınız yavaşsa 720p / 15 FPS önerilir.
        </div>

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg bg-surface-overlay px-4 py-2.5 font-medium text-text-secondary hover:bg-surface-elevated"
          >
            İptal
          </button>
          <button
            onClick={handleStart}
            className="flex-1 rounded-lg bg-accent-blue px-4 py-2.5 font-semibold text-white hover:bg-accent-blue/80"
          >
            Paylaşımı Başlat
          </button>
        </div>
      </div>
    </div>
  );
}
