# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Whisper API Integration**: Complete integration with local Whisper Docker API
  - WhisperAPIClient class with full API compatibility
  - Support for audio transcription with multiple models (base, small)
  - Real-time progress tracking and task management
  - Health check and model list retrieval
  - Comprehensive error handling and retry mechanisms
  - FormData-based request handling for maximum compatibility

- **Configuration Management**: Enhanced configuration system
  - ConfigManager singleton with event-driven updates
  - Whisper API configuration with validation
  - Import/export functionality for configurations
  - Configuration reset and default value management

- **API Settings UI**: React component for Whisper API configuration
  - Connection settings management (baseUrl, timeout, retryAttempts)
  - Model selection and language configuration
  - Real-time connection testing
  - Configuration validation with error/warning display

- **Testing Infrastructure**: Comprehensive test suite
  - Integration tests for Docker API compatibility
  - Real audio transcription tests with sample files
  - Unit tests for configuration management
  - Mock API testing for development

- New WhisperTest component for testing Whisper API functionality
- Test interface for checking API health, models, connection, and tasks
- Integrated test interface into main application toolbar

### Changed
- **Request Handling**: Unified all API requests to use form-data submit method
  - Replaced fetch-based requests with form-data for consistency
  - Improved compatibility with various Node.js environments
  - Eliminated multipart/form-data boundary issues
  - Enhanced error handling for network requests

- **API Client Architecture**: Refactored for better maintainability
  - Modular design with separate utility classes
  - Type-safe interfaces for all API operations
  - Event-driven architecture for real-time updates
  - Comprehensive logging and error reporting

- **Node.js Compatibility**: Resolved FormData compatibility issues
  - Fixed multipart/form-data upload problems
  - Resolved Node.js fetch vs form-data package conflicts
  - Improved cross-platform compatibility
  - Enhanced error handling for file operations

- **Whisper-related IPC code**: Refactored to use a new WhisperManager class
- **Code organization**: Centralized Whisper client management
- **Error handling**: Enhanced error handling and event forwarding in Whisper operations
- **IPC handlers**: Simplified by delegating to WhisperManager methods

- Refactored WhisperManager to use direct instance export pattern
- Simplified WhisperManager implementation by removing static getInstance method
- Improved code consistency by aligning with project's singleton pattern
- Reduced boilerplate in IPC handlers by using direct whisperManager import

### Technical Details
- **Dependencies Added**:
  - `