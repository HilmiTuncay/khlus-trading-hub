import { autoUpdater } from "electron-updater";
import { app, BrowserWindow, Notification } from "electron";

function log(msg: string) {
  console.log(`[Updater] ${msg}`);
}

export function initUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log("Güncelleme kontrol ediliyor...");
  });

  autoUpdater.on("update-available", (info) => {
    log(`Güncelleme mevcut: v${info.version}`);
  });

  autoUpdater.on("update-not-available", () => {
    log("Uygulama güncel.");
  });

  autoUpdater.on("download-progress", (progress) => {
    log(`İndiriliyor: %${Math.round(progress.percent)} (${(progress.bytesPerSecond / 1024).toFixed(0)} KB/s)`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log(`Güncelleme indirildi: v${info.version}`);
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: "Güncelleme Hazır",
        body: `v${info.version} indirildi. Uygulama kapandığında otomatik yüklenecek.`,
      });
      notification.show();
    }
  });

  autoUpdater.on("error", (err) => {
    log(`Güncelleme hatası: ${err.message}`);
  });

  // İlk kontrolü yap
  autoUpdater.checkForUpdates().catch((err) => {
    log(`İlk kontrol hatası: ${err.message}`);
  });

  // Her 30 dakikada bir kontrol et
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log(`Periyodik kontrol hatası: ${err.message}`);
    });
  }, 30 * 60 * 1000);
}
