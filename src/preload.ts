import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electron', {
  // Shortcut related
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  updateShortcut: (action: string, config: any) => ipcRenderer.invoke('shortcuts:update', action, config),

  // Audio recording related
  startRecording: () => ipcRenderer.invoke('audio:start'),
  stopRecording: () => ipcRenderer.invoke('audio:stop'),
  pauseRecording: () => ipcRenderer.invoke('audio:pause'),
  resumeRecording: () => ipcRenderer.invoke('audio:resume'),
  cancelRecording: () => ipcRenderer.invoke('audio:cancel'),
  getRecordingStatus: () => ipcRenderer.invoke('audio:getStatus'),
  updateAudioConfig: (config: any) => ipcRenderer.invoke('audio:updateConfig', config),

  // App control
  quitApp: () => ipcRenderer.invoke('app:quit'),
}); 