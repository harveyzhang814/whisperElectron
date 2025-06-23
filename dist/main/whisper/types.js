"use strict";
/**
 * This module defines TypeScript types for Whisper Docker API integration,
 * including request/response interfaces, error types, and configuration types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGUAGES = exports.SUPPORTED_OUTPUT_FORMATS = exports.SUPPORTED_AUDIO_FORMATS = void 0;
// 支持的音频格式
exports.SUPPORTED_AUDIO_FORMATS = [
    'mp3', 'wav', 'm4a', 'flac', 'ogg', 'wma', 'aac', 'opus'
];
// 支持的输出格式
exports.SUPPORTED_OUTPUT_FORMATS = [
    'txt', 'vtt', 'srt', 'json'
];
// 支持的语言代码
exports.SUPPORTED_LANGUAGES = [
    'auto', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ar', 'hi', 'th', 'vi'
];
