# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Project Structure Refactoring**: Migrated experimental modules to main project structure
  - Moved `src/main/experimental/managers/` to `src/main/managers/`
  - Moved `src/main/experimental/storage/` to `src/main/storage/`
  - Moved `src/main/experimental/types/` to `src/main/types/`
  - Updated all import paths throughout the codebase
  - Maintained backward compatibility during migration
  - Verified build success and functionality after migration

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

- New experimental task management system with improved lifecycle handling
  - New FullTaskManager with enhanced task state management
  - Modular SubTask management system
  - Improved error handling and logging
  - Better task persistence and recovery

- New FullTaskManager system with enhanced task state management
- BaseSubTaskManager for extensible task type management
- RecordingSubTaskManager for recording-specific task handling
- TaskManagerAdapter for backward compatibility
- Conditional initialization system supporting both old and new TaskManager
- Environment variable `USE_NEW_TASK_MANAGER` to switch between systems
- Comprehensive test suite for new TaskManager system
- Migration guide documentation

- **TaskManagerAdapter Enhancements**: Fixed critical recording functionality
  - Added missing stopRecording, startRecording, cancelRecording methods to TaskManagerAdapter
  - Fixed TaskState type errors by using proper enum values instead of strings
  - Implemented automatic task state updates when recording operations complete
  - Added event forwarding mechanism to ensure UI refreshes on task state changes
  - Enhanced error handling for recording operations in new task management system
  - Fixed IPC routing issues by updating audio.ts handlers to support both old and new TaskManager systems
  - Implemented conditional routing based on USE_NEW_TASK_MANAGER environment variable

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

- **Whisper API Client**: Renamed task-related concepts to job-related concepts
  - Renamed `TranscribeTask` to `TranscriptionJob`
  - Updated all related method names and variables
  - Better distinction between recording tasks and transcription jobs
  - Improved code clarity and reduced concept overlap

- Refactored recording and transcription modules to use new task management system
- Enhanced shortcut handling with new task lifecycle integration

- Refactored task management architecture for better scalability
- Improved type safety across task management system
- Enhanced error handling and recovery mechanisms
- Updated IPC handlers to support unified TaskManager interface
- Modified shortcut manager to use unified TaskManager interface

- **Phase 1 Refactoring**: Complete migration to new task management system
  - Removed backward compatibility layer (TaskManagerAdapter)
  - Eliminated AudioRecorder dependency from new system
  - Direct integration of FullTaskManager and RecordingSubTaskManager
  - Simplified main process initialization with single task management system
  - Updated tray menu to use new recording manager API
  - Streamlined application lifecycle management

- **Phase 2 Refactoring**: Complete IPC handler migration
  - Refactored all IPC handlers to use new FullTaskManager and RecordingSubTaskManager
  - Removed compatibility layer from IPC communication
  - Updated recording-related IPC calls to use new 'recording:' namespace
  - Maintained backward compatibility for 'audio:' namespace calls
  - Refactored shortcut manager to directly use new task management system
  - Removed AudioRecorder and TaskManagerAdapter dependencies
  - Simplified IPC handler architecture with direct task manager integration

- **Phase 3 Refactoring**: Complete preload script and frontend migration
  - Updated preload script to use new 'recording:' namespace instead of 'audio:' namespace
  - Removed deprecated audio-related API calls (updateAudioConfig, deleteAudioFile, openAudioFile)
  - Updated type definitions to match new task management system
  - Refactored useRecordingTask and useTasks hooks to handle new API response format
  - Updated App.tsx and TaskList.tsx components to use new recording workflow
  - Simplified task creation and recording management logic
  - Removed manual task state management in favor of automatic system management

### Development
- Added comprehensive test suite for new task management system
- Maintained parallel support for existing task manager during migration

### Technical Details
- **Dependencies Added**:
  - `

### Fixed
- **Critical Bug Fix**: Fixed task state synchronization issue where recording tasks would not update UI state after starting
  - Fixed `RecordingSubTaskManager.updateTaskState()` to properly emit events to `FullTaskManager`
  - Enhanced `FullTaskManager.getTask()` and `getTasks()` to sync with sub-task manager states
  - Fixed IPC handlers for recording stop/cancel to use correct task manager methods
  - Added proper event forwarding from sub-task managers to frontend via `task:refresh` events
  - Fixed state transition validation to allow `CREATED` to `RUNNING` transitions for recording tasks
  - Ensured task state changes are properly propagated to frontend UI components

- **Critical Bug Fix**: Fixed shortcut-triggered recording stop not properly closing microphone
  - Fixed `ShortcutAction.STOP_RECORDING` to call `recordingManager.stopTask()` instead of just updating task state
  - Fixed `ShortcutAction.CANCEL_RECORDING` to call `recordingManager.cancelTask()` instead of just updating task state
  - Ensured `node-record-lpcm16` recorder instances are properly stopped and microphone resources are released
  - Fixed microphone resource leak when using keyboard shortcuts to stop/cancel recording
  - Maintained consistency between shortcut operations and UI button operations

### Changed
- Improved task state synchronization between `FullTaskManager` and `RecordingSubTaskManager`
- Enhanced event propagation system to ensure UI updates when task states change
- Updated recording task lifecycle management for better reliability

### UI/UX Improvements
- **TaskList Component**: Added Start button support for `CANCELLED` state tasks
  - Users can now restart recording for cancelled tasks
  - Added proper state text and styling for `CANCELLED` state
  - Enabled task name editing for cancelled tasks
  - Fixed TypeScript linter errors for optional `recordingMetadata` properties

- **Recording Behavior**: Fixed cancel recording behavior to properly delete audio files
  - Added `cancelTask` method to `BaseSubTaskManager` and `RecordingSubTaskManager`
  - Cancel recording now deletes the audio file and clears metadata
  - Stop recording preserves the audio file (COMPLETED state)
  - Cancel recording removes the audio file (CANCELLED state)
  - Fixed IPC handler to use correct `cancelTask` method

- **API Enhancement**: Enhanced `startRecording` interface to support task-specific recording
  - Added optional `taskId` parameter to `startRecording` method
  - When `taskId` is provided: starts recording for the specified task (CREATED/CANCELLED state only)
  - When `taskId` is not provided: creates new task and starts recording (original behavior)
  - Added proper state validation and error handling for task-specific recording
  - Updated TypeScript definitions and IPC handlers to support the new interface

- **API Enhancement**: Enhanced `stopRecording` interface to support task-specific stopping
  - Added optional `taskId` parameter to `stopRecording` method
  - When `taskId` is provided: stops recording for the specified task (RUNNING state only)
  - When `taskId` is not provided: stops current active recording (original behavior)
  - Added proper state validation and error handling for task-specific stopping
  - Updated TypeScript definitions and IPC handlers to support the new interface

- **Code Quality**: Optimized IPC handler code structure for better readability
  - Refactored `recording:start` and `recording:stop` handlers to use cleaner if-else structure
  - Eliminated code duplication by extracting common logic
  - Improved maintainability and readability of the codebase

- **Task List Sorting**: Implemented chronological sorting for task list display
  - Added sorting by creation time in descending order (newest tasks first)
  - Updated IPC handler to pass sorting parameters to task manager
  - Leveraged existing database-level sorting for optimal performance
  - Improved user experience by showing most recent tasks at the top

## [1.0.0] - 2024-01-XX

### Added
- Initial release of WhisperElectron
- Basic audio recording functionality
- Task management system
- Whisper API integration
- System tray support
- Keyboard shortcuts
- Configuration management
- IPC communication system

### Features
- Record audio using system microphone
- Manage recording tasks with status tracking
- Transcribe audio using Whisper API
- Configure Whisper API settings
- Customize keyboard shortcuts
- Minimize to system tray
- View task history and status

### Technical
- Electron-based desktop application
- TypeScript for type safety
- SQLite for task persistence
- React for user interface
- Vite for build tooling
- IPC for main-renderer communication

- **Refactor**: All recording functionality for the new system has been migrated to RecordingSubTaskManager. AudioRecorder is now only used by the legacy system. The new system no longer depends on AudioRecorder for any recording operations.
- **Fix**: Fixed startRecording error in TaskManagerAdapter by correctly finding tasks in CREATED state and calling appropriate TaskManager methods.

### Removed
- Legacy TaskManager and AudioRecorder classes
- Compatibility adapter (taskManagerAdapter.ts)
- Deprecated audio.ts module
- Deprecated taskManager.ts module
- Unused type definitions and imports
- Complex event bus system in front-end hooks
- Unnecessary state management complexity

### Fixed
- SQLite schema initialization issues
- Task state synchronization problems
- Event emitter forwarding issues
- Compilation errors from unused imports
- Type definition mismatches
- **BREAKING**: Fixed task state transition validation to allow CREATED to RUNNING transition for recording tasks
- **BREAKING**: Fixed EventEmitter inheritance issue in FullTaskManager to resolve "emit is not a function" error