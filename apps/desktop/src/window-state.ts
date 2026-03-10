import { app } from "electron";
import fs from "fs";
import path from "path";

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

const DEFAULTS: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false,
};

export function loadWindowState(): WindowState {
  try {
    const data = fs.readFileSync(STATE_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(data) };
  } catch {
    return DEFAULTS;
  }
}

export function saveWindowState(win: Electron.BrowserWindow): void {
  const bounds = win.getBounds();
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: win.isMaximized(),
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}
