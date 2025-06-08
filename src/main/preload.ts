import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Shortcut related methods
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  updateShortcut: (action: string, config: any) => ipcRenderer.invoke('shortcuts:update', action, config),
  
  // Audio recording related methods
  startRecording: () => ipcRenderer.invoke('audio:start'),
  stopRecording: () => ipcRenderer.invoke('audio:stop'),
  pauseRecording: () => ipcRenderer.invoke('audio:pause'),
  resumeRecording: () => ipcRenderer.invoke('audio:resume'),
  cancelRecording: () => ipcRenderer.invoke('audio:cancel'),
  getRecordingStatus: () => ipcRenderer.invoke('audio:getStatus'),
  updateAudioConfig: (config: any) => ipcRenderer.invoke('audio:updateConfig', config),

  // App control methods
  quitApp: () => ipcRenderer.invoke('app:quit'),
}); 