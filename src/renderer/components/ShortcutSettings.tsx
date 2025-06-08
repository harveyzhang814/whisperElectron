import React, { useEffect, useState } from 'react';
import './ShortcutSettings.css';

interface ShortcutSettingsProps {
  onClose: () => void;
}

export const ShortcutSettings: React.FC<ShortcutSettingsProps> = ({ onClose }) => {
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [recordingAction, setRecordingAction] = useState<string | null>(null);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    const loadedShortcuts = await window.electron.getShortcuts();
    setShortcuts(loadedShortcuts as any[]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, shortcut: any) => {
    if (recordingAction === shortcut.action) {
      e.preventDefault();
      const modifiers = [];
      if (e.ctrlKey || e.metaKey) {
        modifiers.push('CommandOrControl');
      }
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');
      if (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        e.key === 'Shift' ||
        e.key === 'Alt'
      ) {
        return;
      }
      const mainKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const newKey = [...modifiers, mainKey].join('+');
      updateShortcut(shortcut.action, { key: newKey });
      setRecordingAction(null);
    }
  };

  const updateShortcut = async (action: string, config: Partial<any>) => {
    await window.electron.updateShortcut(action, config);
    loadShortcuts();
  };

  const toggleShortcut = async (shortcut: any) => {
    await updateShortcut(shortcut.action, { enabled: !shortcut.enabled });
  };

  const startRecording = (action: string) => {
    setRecordingAction(action);
  };

  return (
    <div className="shortcut-settings">
      <div className="shortcut-settings-header">
        <h2>快捷键设置</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="shortcut-list">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.action} className="shortcut-item">
            <span className="shortcut-description">{shortcut.description}</span>
            <div className="shortcut-controls">
              <button
                className={`shortcut-key ${recordingAction === shortcut.action ? 'recording' : ''}`}
                onClick={() => startRecording(shortcut.action)}
                onKeyDown={(e) => handleKeyDown(e, shortcut)}
                tabIndex={0}
              >
                {recordingAction === shortcut.action ? '请按下新的快捷键...' : shortcut.key}
              </button>
              <button
                className={`toggle-button ${shortcut.enabled ? 'enabled' : 'disabled'}`}
                onClick={() => toggleShortcut(shortcut)}
              >
                {shortcut.enabled ? '启用' : '禁用'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 