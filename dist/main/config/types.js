"use strict";
/**
 * Configuration Types
 *
 * This file defines all configuration-related types and interfaces for the WhisperElectron application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigErrorType = void 0;
/**
 * Configuration error types
 */
var ConfigErrorType;
(function (ConfigErrorType) {
    ConfigErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ConfigErrorType["STORAGE_ERROR"] = "STORAGE_ERROR";
    ConfigErrorType["MIGRATION_ERROR"] = "MIGRATION_ERROR";
    ConfigErrorType["IMPORT_ERROR"] = "IMPORT_ERROR";
    ConfigErrorType["EXPORT_ERROR"] = "EXPORT_ERROR";
})(ConfigErrorType || (exports.ConfigErrorType = ConfigErrorType = {}));
