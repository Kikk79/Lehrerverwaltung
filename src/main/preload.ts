import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  quit: () => ipcRenderer.invoke('app:quit'),
  
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update:available', callback);
    return () => ipcRenderer.removeListener('update:available', callback);
  },
  
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update:downloaded', callback);
    return () => ipcRenderer.removeListener('update:downloaded', callback);
  }
};

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI);