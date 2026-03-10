interface ElectronAPI {
  isElectron: boolean;
  showNotification: (title: string, body: string) => Promise<void>;
  setTrayBadge: (count: number) => Promise<void>;
  getVersion: () => Promise<string>;
  onUpdateDownloaded?: (callback: (version: string) => void) => void;
  installUpdate?: () => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
