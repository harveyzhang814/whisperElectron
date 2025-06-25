import { EventEmitter } from 'events';
import {
  BaseTask,
  TaskState,
  TaskEvent,
  TaskEventType,
  TaskStateChangedEvent,
  TaskProgressUpdatedEvent,
  TaskErrorEvent
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';

/**
 * Options for creating a subtask
 */
export interface SubTaskOptions {
  name: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Base class for all subtask managers.
 * Provides common functionality and enforces consistent interface.
 */
export abstract class BaseSubTaskManager<T extends BaseTask = BaseTask> {
  protected taskManager: EventEmitter;
  protected type: string;
  protected tasks: Map<string, T>;
  protected initialized: boolean = false;
  protected storage: TaskStorageInterface;

  constructor(taskManager: EventEmitter, type: string, storage: TaskStorageInterface) {
    this.taskManager = taskManager;
    this.type = type;
    this.tasks = new Map();
    this.storage = storage;
  }

  /**
   * Initialize the subtask manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.onInitialize();
      this.initialized = true;
    } catch (error) {
      await this.handleError('initialize', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.onCleanup();
      this.initialized = false;
    } catch (error) {
      await this.handleError('cleanup', error);
      throw error;
    }
  }

  /**
   * Create a new subtask
   */
  public async createTask(taskId: string, options: SubTaskOptions): Promise<T> {
    this.ensureInitialized();

    try {
      const task = await this.onCreateTask(taskId, options);
      this.tasks.set(taskId, task);
      return task;
    } catch (error) {
      await this.handleError('createTask', error);
      throw error;
    }
  }

  /**
   * Start a task
   */
  public async startTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStateTransition(task.state, TaskState.RUNNING)) {
        throw new Error(`Invalid state transition from ${task.state} to ${TaskState.RUNNING}`);
      }

      await this.onStartTask(task);
      await this.updateTaskState(taskId, TaskState.RUNNING);
    } catch (error) {
      await this.handleError('startTask', error);
      throw error;
    }
  }

  /**
   * Pause a task
   */
  public async pauseTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStateTransition(task.state, TaskState.PAUSED)) {
        throw new Error(`Invalid state transition from ${task.state} to ${TaskState.PAUSED}`);
      }

      await this.onPauseTask(task);
      await this.updateTaskState(taskId, TaskState.PAUSED);
    } catch (error) {
      await this.handleError('pauseTask', error);
      throw error;
    }
  }

  /**
   * Resume a task
   */
  public async resumeTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStateTransition(task.state, TaskState.RUNNING)) {
        throw new Error(`Invalid state transition from ${task.state} to ${TaskState.RUNNING}`);
      }

      await this.onResumeTask(task);
      await this.updateTaskState(taskId, TaskState.RUNNING);
    } catch (error) {
      await this.handleError('resumeTask', error);
      throw error;
    }
  }

  /**
   * Stop a task
   */
  public async stopTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStateTransition(task.state, TaskState.COMPLETED)) {
        throw new Error(`Invalid state transition from ${task.state} to ${TaskState.COMPLETED}`);
      }

      await this.onStopTask(task);
      await this.updateTaskState(taskId, TaskState.COMPLETED);
    } catch (error) {
      await this.handleError('stopTask', error);
      throw error;
    }
  }

  /**
   * Cancel a task
   */
  public async cancelTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStateTransition(task.state, TaskState.CANCELLED)) {
        throw new Error(`Invalid state transition from ${task.state} to ${TaskState.CANCELLED}`);
      }

      await this.onCancelTask(task);
      await this.updateTaskState(taskId, TaskState.CANCELLED);
    } catch (error) {
      await this.handleError('cancelTask', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  public async deleteTask(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      await this.onDeleteTask(task);
      this.tasks.delete(taskId);
      await this.emitTaskEvent({
        type: TaskEventType.TASK_DELETED,
        taskId,
        timestamp: Date.now()
      });
    } catch (error) {
      await this.handleError('deleteTask', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): T | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks managed by this manager
   */
  public getTasks(): T[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task type
   */
  public getType(): string {
    return this.type;
  }

  /**
   * Update task progress
   */
  protected async updateTaskProgress(taskId: string, progress: number, detail?: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    task.progress = Math.max(0, Math.min(100, progress));
    task.metadata.updatedAt = Date.now();

    await this.emitTaskEvent({
      type: TaskEventType.PROGRESS_UPDATED,
      taskId,
      timestamp: Date.now(),
      progress: task.progress,
      detail
    } as TaskProgressUpdatedEvent);
  }

  /**
   * Update task state
   */
  public async updateTaskState(taskId: string, newState: TaskState): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    const previousState = task.state;
    task.state = newState;
    task.metadata.updatedAt = Date.now();

    // Save the complete task data including extended fields
    // For recording tasks, this will include recordingMetadata, config, recordingState, etc.
    await this.storage.saveTask(task as any);

    await this.emitTaskEvent({
      type: TaskEventType.STATE_CHANGED,
      taskId,
      timestamp: Date.now(),
      previousState,
      newState
    } as TaskStateChangedEvent);

    await this.handleTaskStateChange(taskId, newState);
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  protected abstract onCreateTask(taskId: string, options: SubTaskOptions): Promise<T>;
  protected abstract onStartTask(task: T): Promise<void>;
  protected abstract onPauseTask(task: T): Promise<void>;
  protected abstract onResumeTask(task: T): Promise<void>;
  protected abstract onStopTask(task: T): Promise<void>;
  protected abstract onDeleteTask(task: T): Promise<void>;
  protected abstract handleTaskStateChange(taskId: string, newState: TaskState): Promise<void>;
  protected abstract onCancelTask(task: T): Promise<void>;

  // Protected utility methods
  protected validateStateTransition(currentState: TaskState, newState: TaskState): boolean {
    const validTransitions: Record<TaskState, TaskState[]> = {
      [TaskState.CREATED]: [TaskState.INITIALIZING, TaskState.RUNNING, TaskState.CANCELLED],
      [TaskState.INITIALIZING]: [TaskState.RUNNING, TaskState.FAILED, TaskState.CANCELLED],
      [TaskState.RUNNING]: [TaskState.PAUSED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED],
      [TaskState.PAUSED]: [TaskState.RUNNING, TaskState.CANCELLED],
      [TaskState.COMPLETED]: [],
      [TaskState.FAILED]: [TaskState.INITIALIZING, TaskState.RUNNING],
      [TaskState.CANCELLED]: [TaskState.INITIALIZING, TaskState.RUNNING]
    };

    return validTransitions[currentState]?.includes(newState) ?? false;
  }

  protected isTaskInFinalState(state: TaskState): boolean {
    return [
      TaskState.COMPLETED,
      TaskState.FAILED,
      TaskState.CANCELLED
    ].includes(state);
  }

  protected async handleError(operation: string, error: any): Promise<void> {
    console.error(`Error in ${this.type} manager during ${operation}:`, error);

    const taskId = this.extractTaskIdFromError(error);
    if (taskId) {
      await this.emitTaskEvent({
        type: TaskEventType.ERROR_OCCURRED,
        taskId,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error))
      } as TaskErrorEvent);
    }
  }

  protected extractTaskIdFromError(_error: any): string | undefined {
    // Subclasses can override this to provide better error handling
    return undefined;
  }

  protected async emitTaskEvent(event: TaskEvent): Promise<void> {
    this.taskManager.emit('taskEvent', event);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.type} manager is not initialized`);
    }
  }

  private getTaskOrThrow(taskId: string): T {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }
} 