import { UnifiedTask } from './task';

/**
 * Configuration for unified task concurrency control
 */
export interface ConcurrencyConfig {
  maxConcurrentTasks: number;
  currentRunningTasks: number;
}

/**
 * Stage-specific concurrency settings
 */
export interface StageConcurrencyConfig {
  [stage: string]: ConcurrencyConfig;
}

/**
 * Task queue entry with priority support
 */
export interface QueuedTask {
  task: UnifiedTask;
  priority: number;
  queuedAt: number;
  targetStage?: string; // Which stage this task is queued for
}

/**
 * Priority levels for tasks
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Task queue interface for unified tasks
 */
export interface TaskQueue {
  enqueue(task: UnifiedTask, priority?: TaskPriority, targetStage?: string): void;
  dequeue(): QueuedTask | undefined;
  peek(): QueuedTask | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
  remove(taskId: string): boolean;
  getTasksByStage(stage: string): QueuedTask[];
}

/**
 * Stage-specific queue interface
 */
export interface StageQueue {
  enqueue(task: UnifiedTask, priority?: TaskPriority): void;
  dequeue(): QueuedTask | undefined;
  peek(): QueuedTask | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
  remove(taskId: string): boolean;
}

/**
 * Multi-stage queue manager interface
 */
export interface MultiStageQueueManager {
  enqueueForStage(task: UnifiedTask, stage: string, priority?: TaskPriority): void;
  dequeueFromStage(stage: string): QueuedTask | undefined;
  peekStage(stage: string): QueuedTask | undefined;
  getStageQueue(stage: string): StageQueue;
  getAllStages(): string[];
  getQueueStats(): {
    totalQueued: number;
    stageStats: { [stage: string]: number };
  };
} 