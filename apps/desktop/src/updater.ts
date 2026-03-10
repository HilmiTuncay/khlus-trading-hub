import { autoUpdater } from "electron-updater";
import { dialog, app } from "electron";

export function initUpdater() {
  // Packaged uygulama degilse (dev modda) guncelleme kontrolu yapma
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Güncelleme Mevcut",
        message: `Yeni sürüm mevcut: v${info.version}. İndirmek ister misiniz?`,
        buttons: ["İndir", "Daha Sonra"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Güncelleme Hazır",
        message: "Güncelleme indirildi. Yüklemek için uygulama yeniden başlatılacak.",
        buttons: ["Şimdi Yeniden Başlat", "Daha Sonra"],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", () => {
    // Guncelleme hatalarini sessizce gecis
  });

  // Baslatildiginda guncelleme kontrolu yap
  autoUpdater.checkForUpdates();
}
