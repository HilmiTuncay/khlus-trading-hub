interface ElectronAPI {
  isElectron: boolean;
  showNotification: (title: string, body: string) => Promise<void>;
  setTrayBadge: (count: number) => Promise<void>;
  getVersion: () => Promise<string>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
