import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electron', {
  // App lifecycle
  onReady: (callback: () => void) => ipcRenderer.on('app:ready', callback),
  
  // Shortcut related
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
  updateShortcut: (action: string, config: any) => ipcRenderer.invoke('shortcuts:update', action, config),

  // Recording related - 使用新的recording:接口
  startRecording: (taskId?: string) => ipcRenderer.invoke('recording:start', taskId),
  stopRecording: (taskId?: string) => ipcRenderer.invoke('recording:stop', taskId),
  cancelRecording: () => ipcRenderer.invoke('recording:cancel'),
  getRecordingStatus: () => ipcRenderer.invoke('recording:getStatus'),
  getCurrentRecordingTask: () => ipcRenderer.invoke('recording:getCurrentTask'),
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

  // Task related - 使用新的任务管理系统
  createTask: (title: string) => ipcRenderer.invoke('task:create', title),
  updateTask: (id: string, updates: any) => ipcRenderer.invoke('task:update', id, updates),
  getAllTasks: () => ipcRenderer.invoke('task:getAll'),
  deleteTask: (id: string) => ipcRenderer.invoke('task:delete', id),
  getCurrentRecording: () => ipcRenderer.invoke('task:getCurrentRecording'),

  // Task refresh event
  onTaskRefresh: (callback: () => void) => ipcRenderer.on('task:refresh', callback),

  // Whisper 配置相关
  getWhisperConfig: () => ipcRenderer.invoke('config:getWhisper'),
  updateWhisperConfig: (config: any) => ipcRenderer.invoke('config:updateWhisper', config),

  // Whisper 转写相关
  whisperTranscribe: (filePath: string, options?: any) => ipcRenderer.invoke('whisper:transcribe', filePath, options),
  whisperCancel: (jobId: string) => ipcRenderer.invoke('whisper:cancel', jobId),
  whisperGetJob: (jobId: string) => ipcRenderer.invoke('whisper:getJob', jobId),
  whisperGetAllJobs: () => ipcRenderer.invoke('whisper:getAllJobs'),
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
  openAudioFile: (audioPath: string) => ipcRenderer.invoke('audio:openFile', audioPath),
}); 