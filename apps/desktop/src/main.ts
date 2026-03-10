import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Notification,
  session,
  shell,
} from "electron";
import path from "path";
import { autoUpdater } from "electron-updater";
import { createTray, updateTrayBadge, setIsQuitting, getIsQuitting } from "./tray";
import { initUpdater } from "./updater";
import { loadWindowState, saveWindowState } from "./window-state";

const PRODUCTION_URL = "https://khlus-trading-hub.vercel.app";
const DEV_URL = "http://localhost:3000";
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, "..", "resources", "icon.ico"),
    title: "Khlus Trading Hub",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Dev modda localhost, production'da vercel URL
  mainWindow.loadURL(isDev ? DEV_URL : PRODUCTION_URL);

  // Pencere hazir oldugunda goster (beyaz ekran engellenir)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // X butonuna basinca pencere durumunu kaydet ve tray'e kucult
  mainWindow.on("close", (e) => {
    console.log("[App] Pencere kapatma isteği, isQuitting:", getIsQuitting());
    if (mainWindow) saveWindowState(mainWindow);
    if (!getIsQuitting()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  // Sag tik context menu'yu engelle (Discord gibi)
  mainWindow.webContents.on("context-menu", (e) => {
    e.preventDefault();
  });

  // Harici linkleri varsayilan tarayicida ac
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Uygulama URL'si disina navigasyonu engelle, tarayicida ac
  const appUrl = isDev ? DEV_URL : PRODUCTION_URL;
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // DevTools sadece dev modda
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

// Single instance lock - ayni anda sadece 1 uygulama calissin
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Ikinci instance acilmaya calisilinca mevcut pencereyi goster
    console.log("[App] İkinci instance algılandı, mevcut pencere gösteriliyor");
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log("[App] Uygulama başlatıldı, isDev:", isDev);

    // Mikrofon, kamera ve ekran paylaşımı izinlerini otomatik onayla (LiveKit için gerekli)
    const allowedPermissions = ["media", "mediaKeySystem", "midi", "display-capture"];
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(allowedPermissions.includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      return allowedPermissions.includes(permission);
    });
    console.log("[App] Media izinleri yapılandırıldı");

    createWindow();
    console.log("[App] Pencere oluşturuldu");
    createTray(mainWindow!);
    initUpdater();

    // Global shortcut: Ctrl+Shift+K ile pencereyi toggle et
    globalShortcut.register("Ctrl+Shift+K", () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    // IPC: Bildirim goster
    ipcMain.handle("show-notification", (_event, title: string, body: string) => {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body,
          icon: path.join(__dirname, "..", "resources", "icon.png"),
        });
        notification.on("click", () => {
          mainWindow?.show();
          mainWindow?.focus();
        });
        notification.show();
      }
    });

    // IPC: Tray badge guncelle
    ipcMain.handle("set-tray-badge", (_event, count: number) => {
      updateTrayBadge(count);
    });

    // IPC: Uygulama versiyonu
    ipcMain.handle("get-version", () => {
      return app.getVersion();
    });

    // IPC: Güncellemeyi yükle ve yeniden başlat
    ipcMain.handle("install-update", () => {
      autoUpdater.quitAndInstall();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    setIsQuitting(true);
    globalShortcut.unregisterAll();
  });

  app.on("activate", () => {
    // macOS: dock ikonuna tiklaninca pencere yoksa olustur
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
}
