"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  // App lifecycle
  onReady: (callback) => electron.ipcRenderer.on("app:ready", callback),
  // Shortcut related
  getShortcuts: () => electron.ipcRenderer.invoke("shortcuts:get"),
  updateShortcut: (action, config) => electron.ipcRenderer.invoke("shortcuts:update", action, config),
  // Audio recording related
  startRecording: () => electron.ipcRenderer.invoke("audio:start"),
  stopRecording: () => electron.ipcRenderer.invoke("audio:stop"),
  cancelRecording: () => electron.ipcRenderer.invoke("audio:cancel"),
  getRecordingStatus: () => electron.ipcRenderer.invoke("audio:getStatus"),
  updateAudioConfig: (config) => electron.ipcRenderer.invoke("audio:updateConfig", config),
  deleteAudioFile: (audioPath) => electron.ipcRenderer.invoke("audio:deleteFile", audioPath),
  getCurrentRecordingTask: () => electron.ipcRenderer.invoke("task:getCurrentRecording"),
  // App control
  quitApp: () => electron.ipcRenderer.invoke("app:quit"),
  // Task related
  createTask: (title, status) => electron.ipcRenderer.invoke("task:create", title, status),
  updateTask: (id, updates) => electron.ipcRenderer.invoke("task:update", id, updates),
  getAllTasks: () => electron.ipcRenderer.invoke("task:getAll"),
  deleteTask: (id) => electron.ipcRenderer.invoke("task:delete", id),
  openAudioFile: (audioPath) => electron.ipcRenderer.invoke("task:openAudioFile", audioPath)
});
