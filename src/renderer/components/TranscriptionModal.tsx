/**
 * This component provides a modal dialog for transcription functionality.
 * It wraps the TranscriptionTask component in a modal interface for better UX.
 */

import React from 'react';
import { TranscriptionTask } from './TranscriptionTask';
import './TranscriptionModal.css';

interface TranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordingTaskId?: string;
  audioFilePath?: string;
  taskName?: string;
  onTranscriptionComplete?: (taskId: string, result: any) => void;
  onTranscriptionError?: (taskId: string, error: any) => void;
}

export const TranscriptionModal: React.FC<TranscriptionModalProps> = ({
  isOpen,
  onClose,
  recordingTaskId,
  audioFilePath,
  taskName,
  onTranscriptionComplete,
  onTranscriptionError
}) => {
  if (!isOpen) {
    return null;
  }

  const handleTranscriptionComplete = (taskId: string, result: any) => {
    console.log('Transcription completed in modal:', { taskId, result });
    if (onTranscriptionComplete) {
      onTranscriptionComplete(taskId, result);
    }
    // 可以选择自动关闭弹窗或保持打开以显示结果
  };

  const handleTranscriptionError = (taskId: string, error: any) => {
    console.error('Transcription error in modal:', { taskId, error });
    if (onTranscriptionError) {
      onTranscriptionError(taskId, error);
    }
  };

  return (
    <div className="transcription-modal-overlay" onClick={onClose}>
      <div className="transcription-modal" onClick={(e) => e.stopPropagation()}>
        <div className="transcription-modal-header">
          <h3>Transcribe Audio</h3>
          {taskName && (
            <div className="task-name-display">
              Task: {taskName}
            </div>
          )}
          <button 
            className="transcription-modal-close"
            onClick={onClose}
            aria-label="Close transcription modal"
          >
            ×
          </button>
        </div>
        <div className="transcription-modal-content">
          <TranscriptionTask
            recordingTaskId={recordingTaskId}
            audioFilePath={audioFilePath}
            onTranscriptionComplete={handleTranscriptionComplete}
            onTranscriptionError={handleTranscriptionError}
          />
        </div>
      </div>
    </div>
  );
}; 