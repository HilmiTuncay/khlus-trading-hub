import { app, BrowserWindow, Menu, Tray } from "electron";
import path from "path";

let tray: Tray | null = null;
let cachedWindow: BrowserWindow | null = null;
let isQuitting = false;

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(value: boolean) {
  isQuitting = value;
}

export function createTray(mainWindow: BrowserWindow) {
  cachedWindow = mainWindow;

  const iconPath = path.join(__dirname, "..", "resources", "tray-icon.png");
  tray = new Tray(iconPath);

  tray.setToolTip("Khlus Trading Hub");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Khlus Trading Hub'ı Aç",
      click: () => {
        cachedWindow?.show();
        cachedWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Çıkış",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Sol tik: pencereyi toggle et
  tray.on("click", () => {
    if (!cachedWindow) return;
    if (cachedWindow.isVisible()) {
      cachedWindow.hide();
    } else {
      cachedWindow.show();
      cachedWindow.focus();
    }
  });
}

export function updateTrayBadge(count: number) {
  if (!tray) return;
  if (count > 0) {
    tray.setToolTip(`Khlus Trading Hub (${count} yeni mesaj)`);
  } else {
    tray.setToolTip("Khlus Trading Hub");
  }
}
