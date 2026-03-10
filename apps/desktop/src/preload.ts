import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  showNotification: (title: string, body: string) => {
    return ipcRenderer.invoke("show-notification", title, body);
  },

  setTrayBadge: (count: number) => {
    return ipcRenderer.invoke("set-tray-badge", count);
  },

  getVersion: () => {
    return ipcRenderer.invoke("get-version");
  },
});
