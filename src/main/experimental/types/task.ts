/**
 * Base task types for the new task management system.
 * These types provide the foundation for all task-related operations.
 */

/**
 * Represents the possible states of a base task
 */
export enum TaskState {
  CREATED = 'CREATED',
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Base task event types
 */
export enum TaskEventType {
  STATE_CHANGED = 'STATE_CHANGED',
  PROGRESS_UPDATED = 'PROGRESS_UPDATED',
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  TASK_DELETED = 'TASK_DELETED'
}

/**
 * Base task event interface
 */
export interface TaskEvent {
  type: TaskEventType;
  taskId: string;
  timestamp: number;
}

/**
 * State change event
 */
export interface TaskStateChangedEvent extends TaskEvent {
  type: TaskEventType.STATE_CHANGED;
  previousState: TaskState;
  newState: TaskState;
}

/**
 * Progress update event
 */
export interface TaskProgressUpdatedEvent extends TaskEvent {
  type: TaskEventType.PROGRESS_UPDATED;
  progress: number; // 0-100
  detail?: string;
}

/**
 * Error event
 */
export interface TaskErrorEvent extends TaskEvent {
  type: TaskEventType.ERROR_OCCURRED;
  error: Error;
  errorCode?: string;
}

/**
 * Base task metadata
 */
export interface TaskMetadata {
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  tags?: string[];
}

/**
 * Base task interface
 */
export interface BaseTask {
  id: string;
  type: string;
  state: TaskState;
  metadata: TaskMetadata;
  progress: number;
  error?: Error;
  subTasks?: BaseTask[];
  extendedData?: any; // For task-specific extended data (e.g., recording metadata)
}

/**
 * Task manager configuration
 */
export interface TaskManagerConfig {
  storageDirectory: string;
  maxConcurrentTasks?: number;
  autoCleanupCompleted?: boolean;
  retentionPeriod?: number; // in milliseconds
}

/**
 * Task event handler type
 */
export type TaskEventHandler = (event: TaskEvent) => void;

/**
 * Task filter options
 */
export interface TaskFilterOptions {
  states?: TaskState[];
  types?: string[];
  tags?: string[];
  fromDate?: number;
  toDate?: number;
}

/**
 * Task sort options
 */
export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'name' | 'state' | 'progress';
  order: 'asc' | 'desc';
} 