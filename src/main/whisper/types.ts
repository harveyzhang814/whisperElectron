/**
 * This module defines TypeScript types for Whisper Docker API integration,
 * including request/response interfaces, error types, and configuration types.
 */

// Whisper API 请求参数类型
export interface WhisperTranscribeRequest {
  /** 音频文件路径 */
  file: string;
  /** 转写模型名称 */
  model?: string;
  /** 输出语言代码 */
  language?: string;
  /** 输出格式 */
  output_format?: 'txt' | 'vtt' | 'srt' | 'json';
  /** 是否包含时间戳 */
  word_timestamps?: boolean;
  /** 是否包含置信度 */
  condition_on_previous_text?: boolean;
  /** 初始提示文本 */
  initial_prompt?: string;
  /** 温度参数 */
  temperature?: number;
  /** 压缩比阈值 */
  compression_ratio_threshold?: number;
  /** 对数概率阈值 */
  logprob_threshold?: number;
  /** 无语音阈值 */
  no_speech_threshold?: number;
}

// Whisper API 响应类型
export interface WhisperTranscribeResponse {
  /** 转写文本 */
  text: string;
  /** 语言代码 */
  language?: string;
  /** 语言概率 */
  language_probability?: number;
  /** 时间戳信息 */
  segments?: WhisperSegment[];
  /** 单词时间戳 */
  word_timestamps?: WhisperWordTimestamp[];
}

// 转写片段类型
export interface WhisperSegment {
  /** 开始时间（秒） */
  start: number;
  /** 结束时间（秒） */
  end: number;
  /** 文本内容 */
  text: string;
  /** 置信度 */
  confidence?: number;
}

// 单词时间戳类型
export interface WhisperWordTimestamp {
  /** 单词 */
  word: string;
  /** 开始时间（秒） */
  start: number;
  /** 结束时间（秒） */
  end: number;
  /** 置信度 */
  confidence?: number;
}

// 模型信息类型
export interface WhisperModel {
  /** 模型名称 */
  name: string;
  /** 模型描述 */
  description?: string;
  /** 支持的语言 */
  languages?: string[];
  /** 模型大小 */
  size?: string;
  /** 是否可用 */
  available?: boolean;
}

// 健康检查响应类型
export interface WhisperHealthResponse {
  /** 服务状态 */
  status: 'healthy' | 'unhealthy';
  /** 服务版本 */
  version?: string;
  /** 可用模型列表 */
  models?: WhisperModel[];
  /** 错误信息 */
  error?: string;
  /** 时间戳（内部使用） */
  timestamp?: number;
}

// 转写进度回调类型
export interface TranscribeProgress {
  /** 进度百分比 (0-100) */
  progress: number;
  /** 当前状态 */
  status: 'uploading' | 'processing' | 'completed' | 'error';
  /** 状态消息 */
  message: string;
  /** 错误信息 */
  error?: string;
}

// 转写任务状态类型
export interface TranscriptionJob {
  /** 任务ID */
  id: string;
  /** 文件路径 */
  filePath: string;
  /** 任务状态 */
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  /** 进度信息 */
  progress: TranscribeProgress;
  /** 创建时间 */
  createdAt: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 转写结果 */
  result?: WhisperTranscribeResponse;
  /** 错误信息 */
  error?: string;
}

// API 客户端配置类型
export interface WhisperAPIClientConfig {
  /** API 基础URL */
  baseUrl: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryAttempts: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 默认模型 */
  defaultModel: string;
  /** 默认语言 */
  defaultLanguage: string;
  /** 默认输出格式 */
  defaultOutputFormat: 'txt' | 'vtt' | 'srt' | 'json';
  /** 是否启用单词时间戳 */
  enableWordTimestamps: boolean;
  /** 是否启用置信度 */
  enableConfidence: boolean;
}

// 支持的音频格式
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'm4a', 'flac', 'ogg', 'wma', 'aac', 'opus'
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

// 支持的输出格式
export const SUPPORTED_OUTPUT_FORMATS = [
  'txt', 'vtt', 'srt', 'json'
] as const;

export type SupportedOutputFormat = typeof SUPPORTED_OUTPUT_FORMATS[number];

// 支持的语言代码
export const SUPPORTED_LANGUAGES = [
  'auto', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar', 'hi', 'th', 'vi'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 事件类型
export type WhisperAPIEvents = {
  'transcribe:start': (jobId: string, filePath: string) => void;
  'transcribe:progress': (jobId: string, progress: TranscribeProgress) => void;
  'transcribe:complete': (jobId: string, result: WhisperTranscribeResponse) => void;
  'transcribe:error': (jobId: string, error: string) => void;
  'transcribe:cancel': (jobId: string) => void;
  'models:update': (models: WhisperModel[]) => void;
  'health:update': (health: WhisperHealthResponse) => void;
}; 