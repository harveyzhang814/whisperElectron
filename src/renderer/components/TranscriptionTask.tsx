/**
 * This component provides a user interface for managing transcription tasks.
 * It allows users to start, monitor, and cancel transcription operations.
 */

import React, { useState, useEffect } from 'react';
import { useTranscription } from '../hooks/useTranscription';
import './TranscriptionTask.css';

interface TranscriptionTaskProps {
  recordingTaskId?: string;
  audioFilePath?: string;
  onTranscriptionComplete?: (taskId: string, result: any) => void;
  onTranscriptionError?: (taskId: string, error: any) => void;
}

export const TranscriptionTask: React.FC<TranscriptionTaskProps> = ({
  recordingTaskId,
  audioFilePath,
  onTranscriptionComplete,
  onTranscriptionError
}) => {
  const { isTranscribing, activeTaskIds, startTranscription, cancelTranscription, error: transcriptionError } = useTranscription();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查当前任务是否正在转录
  const isCurrentTaskTranscribing = recordingTaskId ? activeTaskIds.includes(recordingTaskId) : false;

  // 启动转录
  const handleStartTranscription = async () => {
    if (!recordingTaskId || !audioFilePath) {
      setError('Recording task ID and audio file path are required');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const result = await startTranscription(recordingTaskId, {
        // 可以在这里添加转录选项
        model: 'base',
        language: 'auto',
        outputFormat: 'txt'
      });
      
      if (result.success) {
        console.log('Transcription started successfully for task:', recordingTaskId);
      } else {
        setError(result.error || 'Failed to start transcription');
      }
    } catch (err) {
      console.error('Error starting transcription:', err);
      setError('Failed to start transcription');
    } finally {
      setIsStarting(false);
    }
  };

  // 取消转录
  const handleCancelTranscription = async () => {
    if (!recordingTaskId) return;

    try {
      const result = await cancelTranscription(recordingTaskId);
      
      if (result.success) {
        console.log('Transcription cancelled successfully for task:', recordingTaskId);
      } else {
        setError(result.error || 'Failed to cancel transcription');
      }
    } catch (err) {
      console.error('Error cancelling transcription:', err);
      setError('Failed to cancel transcription');
    }
  };

  // 监听转录完成和错误事件
  useEffect(() => {
    const handleTranscriptionComplete = (result: any) => {
      console.log('Transcription completed:', result);
      if (onTranscriptionComplete && recordingTaskId) {
        onTranscriptionComplete(recordingTaskId, result);
      }
    };

    const handleTranscriptionError = (error: any) => {
      console.error('Transcription error:', error);
      if (onTranscriptionError && recordingTaskId) {
        onTranscriptionError(recordingTaskId, error);
      }
      setError(error.message || 'Transcription failed');
    };

    // 设置事件监听器
    window.electron.onTranscriptionComplete(handleTranscriptionComplete);
    window.electron.onTranscriptionError(handleTranscriptionError);

    // 清理函数
    return () => {
      window.electron.removeTranscriptionListeners();
    };
  }, [recordingTaskId, onTranscriptionComplete, onTranscriptionError]);

  // 显示转录错误
  useEffect(() => {
    if (transcriptionError) {
      setError(transcriptionError);
    }
  }, [transcriptionError]);

  const getStatusText = () => {
    if (isCurrentTaskTranscribing) {
      return 'Transcribing...';
    }
    if (isTranscribing) {
      return 'Another task is transcribing...';
    }
    return 'Ready to transcribe';
  };

  const getProgressText = () => {
    if (isCurrentTaskTranscribing) {
      return 'Processing audio file...';
    }
    return '';
  };

  const canStartTranscription = () => {
    return !isStarting && !isCurrentTaskTranscribing && !isTranscribing && recordingTaskId && audioFilePath;
  };

  const canCancelTranscription = () => {
    return isCurrentTaskTranscribing;
  };

  return (
    <div className="transcription-task">
      <div className="transcription-status">
        <div className="status-text">{getStatusText()}</div>
        {getProgressText() && (
          <div className="progress-text">{getProgressText()}</div>
        )}
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <div className="transcription-controls">
        {canStartTranscription() && (
          <button
            className="transcription-button start"
            onClick={handleStartTranscription}
            disabled={isStarting}
          >
            {isStarting ? 'Starting...' : 'Start Transcription'}
          </button>
        )}

        {canCancelTranscription() && (
          <button
            className="transcription-button cancel"
            onClick={handleCancelTranscription}
          >
            Cancel Transcription
          </button>
        )}
      </div>

      <div className="transcription-info">
        {recordingTaskId && (
          <div className="info-item">
            <span className="info-label">Task ID:</span>
            <span className="info-value">{recordingTaskId}</span>
          </div>
        )}
        {audioFilePath && (
          <div className="info-item">
            <span className="info-label">Audio File:</span>
            <span className="info-value">{audioFilePath}</span>
          </div>
        )}
      </div>
    </div>
  );
}; 