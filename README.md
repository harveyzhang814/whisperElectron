# WhisperElectron

**WhisperElectron** is a modern, cross-platform desktop application for seamless audio recording and speech transcription, powered by Electron, React, and OpenAI's Whisper API. Designed for productivity, it features global hotkeys, instant transcription, and a beautiful native-like UI for macOS.

---

## 🚀 Features

- **Global Hotkeys**: Start, stop, or cancel recording from anywhere with customizable shortcuts.
- **One-Click Recording**: Instantly create and manage audio memos or tasks.
- **Automatic Transcription**: Audio is transcribed automatically using Whisper API after recording.
- **Task Management**: Organize, edit, and review all your recordings and transcriptions in a unified task list.
- **Persistent History**: All tasks and audio files are stored locally with metadata for easy retrieval.
- **System Tray Integration**: Minimize to tray, control recording, and access settings without leaving your workflow.
- **Rich Settings**: Configure audio format, sample rate, channels, and manage API keys.
- **Dark/Light Mode**: Follows your system theme for a native look and feel.
- **Cross-Platform**: Built with Electron, works on macOS, Windows, and Linux.

---

## 🖥️ Screenshots

<!-- Add screenshots here if available -->
<p align="center">
  <img src="docs/screenshots/main.png" width="600" alt="Main Window"/>
  <img src="docs/screenshots/settings.png" width="600" alt="Settings Window"/>
</p>

---

## 🏗️ Architecture Overview

- **Electron Main Process**: Handles global shortcuts, audio recording, IPC, and system tray.
- **React Renderer**: Provides a responsive, modern UI for task management and settings.
- **SQLite**: Local database for persistent task and audio metadata.
- **FFmpeg**: Audio processing and format conversion.
- **Whisper API**: Cloud-based speech-to-text transcription.

### Main Modules

- **GlobalShortcut**: Listens for and manages system-wide hotkeys.
- **AudioRecorder**: Controls audio capture, file management, and error handling.
- **TaskManager**: Manages all recording tasks, their states, and history.
- **TranscriptionProcessor**: Handles API communication and result formatting.
- **UI Components**: Built with React for a native-like experience.

---

## 📦 Project Structure

```
whisperElectron/
├── src/
│   ├── main/         # Electron main process (shortcuts, audio, IPC)
│   ├── renderer/     # React renderer (UI, components, hooks)
│   ├── assets/       # Static assets (icons, etc.)
│   └── preload.ts    # Preload script for secure API exposure
├── docs/             # Documentation and design docs
├── public/           # Static public files
├── package.json      # Project metadata and scripts
└── tsconfig.json     # TypeScript configuration
```

---

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whisperElectron.git
   cd whisperElectron
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the app in development**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run make
   ```

---

## 🔑 Configuration

- **API Key**: Set your Whisper API key in the Settings window.
- **Audio Settings**: Choose format (WAV/MP3), sample rate, and channels.
- **Hotkeys**: Customize global shortcuts for recording actions.

---

## 📝 Usage

- Press the global hotkey to start recording from anywhere.
- Press again to stop and automatically transcribe.
- View, edit, or export your recordings and transcripts in the task list.
- Minimize to tray for background operation.

---

## 🛡️ Security & Privacy

- All audio files and transcripts are stored locally.
- API keys are securely managed and never shared.
- Temporary files are automatically cleaned up.

---

## 🛠️ Roadmap

- [ ] Real-time transcription
- [ ] More audio formats
- [ ] Multi-language support
- [ ] Audio editing features
- [ ] Export and backup options

---

## 🤝 Contributing

Contributions are welcome! Please read the [contributing guidelines](docs/CONTRIBUTING.md) and open an issue or pull request.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
- [FFmpeg](https://ffmpeg.org/)

---

> **WhisperElectron** — Your productivity companion for effortless voice notes and transcription. 