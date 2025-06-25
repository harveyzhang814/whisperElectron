import { BaseTask } from './task';

/**
 * Configuration for task concurrency control
 */
export interface ConcurrencyConfig {
  maxConcurrentTasks: number;
  currentRunningTasks: number;
}

/**
 * Task type specific concurrency settings
 */
export interface TaskTypeConcurrencyConfig {
  [taskType: string]: ConcurrencyConfig;
}

/**
 * Task queue entry with priority support
 */
export interface QueuedTask {
  task: BaseTask;
  priority: number;
  queuedAt: number;
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
 * Task queue interface
 */
export interface TaskQueue {
  enqueue(task: BaseTask, priority?: TaskPriority): void;
  dequeue(): BaseTask | undefined;
  peek(): BaseTask | undefined;
  isEmpty(): boolean;
  size(): number;
  clear(): void;
  remove(taskId: string): boolean;
} 