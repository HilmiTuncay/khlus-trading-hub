import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Notification,
} from "electron";
import path from "path";
import { createTray, updateTrayBadge, setIsQuitting, getIsQuitting } from "./tray";
import { initUpdater } from "./updater";

const PRODUCTION_URL = "https://khlus-trading-hub.vercel.app";
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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

  // Production URL'yi yukle
  mainWindow.loadURL(PRODUCTION_URL);

  // Pencere hazir oldugunda goster (beyaz ekran engellenir)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // X butonuna basinca tray'e kucult (kapatma)
  mainWindow.on("close", (e) => {
    if (!getIsQuitting()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  // Sag tik context menu'yu engelle (Discord gibi)
  mainWindow.webContents.on("context-menu", (e) => {
    e.preventDefault();
  });

  // Yeni pencere acilmasini engelle (linkler mevcut pencerede acilsin)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
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
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
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
