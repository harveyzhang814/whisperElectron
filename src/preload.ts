import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electron', {
  // App lifecycle
  onReady: (callback: () => void) => ipcRenderer.on('app:ready', callback),
  
  // Shortcut related
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  updateShortcut: (action: string, config: any) => ipcRenderer.invoke('shortcuts:update', action, config),

  // Audio recording related
  startRecording: () => ipcRenderer.invoke('audio:start'),
  stopRecording: () => ipcRenderer.invoke('audio:stop'),
  cancelRecording: () => ipcRenderer.invoke('audio:cancel'),
  getRecordingStatus: () => ipcRenderer.invoke('audio:getStatus'),
  updateAudioConfig: (config: any) => ipcRenderer.invoke('audio:updateConfig', config),
  deleteAudioFile: (audioPath: string) => ipcRenderer.invoke('audio:deleteFile', audioPath),
  getCurrentRecordingTask: () => ipcRenderer.invoke('task:getCurrentRecording'),
  onRecordingStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('recording:status', (_event, status) => callback(status));
  },
  removeRecordingStatusListener: () => {
    ipcRenderer.removeAllListeners('recording:status');
  },
  sendRecordingStatus: (status: any) => {
    ipcRenderer.send('recording:status', status);
  },

  // Tray related
  onRecordingStart: (callback: () => void) => {
    ipcRenderer.on('recording:start', callback);
  },
  onRecordingStop: (callback: () => void) => {
    ipcRenderer.on('recording:stop', callback);
  },
  onRecordingCancel: (callback: () => void) => {
    ipcRenderer.on('recording:cancel', callback);
  },
  removeTrayListeners: () => {
    ipcRenderer.removeAllListeners('recording:start');
    ipcRenderer.removeAllListeners('recording:stop');
    ipcRenderer.removeAllListeners('recording:cancel');
  },
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),

  // App control
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // Task related
  createTask: (title: string, status: string) => ipcRenderer.invoke('task:create', title, status),
  updateTask: (id: string, updates: any) => ipcRenderer.invoke('task:update', id, updates),
  getAllTasks: () => ipcRenderer.invoke('task:getAll'),
  deleteTask: (id: string) => ipcRenderer.invoke('task:delete', id),
  openAudioFile: (audioPath: string) => ipcRenderer.invoke('task:openAudioFile', audioPath),

  // Task refresh event
  onTaskRefresh: (callback: () => void) => ipcRenderer.on('task:refresh', callback),

  // Whisper 配置相关
  getWhisperConfig: () => ipcRenderer.invoke('config:getWhisper'),
  updateWhisperConfig: (config: any) => ipcRenderer.invoke('config:updateWhisper', config),

  // Whisper 转写相关
  whisperTranscribe: (filePath: string, options?: any) => ipcRenderer.invoke('whisper:transcribe', filePath, options),
  whisperCancel: (taskId: string) => ipcRenderer.invoke('whisper:cancel', taskId),
  whisperGetTask: (taskId: string) => ipcRenderer.invoke('whisper:getTask', taskId),
  whisperGetAllTasks: () => ipcRenderer.invoke('whisper:getAllTasks'),
  whisperGetModels: () => ipcRenderer.invoke('whisper:getModels'),
  whisperCheckHealth: () => ipcRenderer.invoke('whisper:checkHealth'),
  whisperTestConnection: () => ipcRenderer.invoke('whisper:testConnection'),

  // Whisper 事件监听
  onWhisperProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('whisper:progress', (_event, progress) => callback(progress));
  },
  onWhisperComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('whisper:complete', (_event, result) => callback(result));
  },
  onWhisperError: (callback: (error: any) => void) => {
    ipcRenderer.on('whisper:error', (_event, error) => callback(error));
  },
  removeWhisperListeners: () => {
    ipcRenderer.removeAllListeners('whisper:progress');
    ipcRenderer.removeAllListeners('whisper:complete');
    ipcRenderer.removeAllListeners('whisper:error');
  },
}); 