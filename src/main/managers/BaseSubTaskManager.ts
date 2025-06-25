import { EventEmitter } from 'events';
import {
  TaskStage,
  StageState,
  TaskEvent,
  TaskEventType,
  TaskErrorEvent,
  StageStateChangedEvent,
  StageProgressUpdatedEvent,
  UnifiedTask
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';

export interface SubTaskStageOptions {
  name: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Base class for all subtask managers.
 * Provides common functionality for managing task stages in the unified architecture.
 */
export abstract class BaseSubTaskManager {
  protected taskManager: EventEmitter;
  protected stage: TaskStage;
  protected managedTasks: Map<string, UnifiedTask>;
  protected initialized: boolean = false;
  protected storage: TaskStorageInterface;

  constructor(taskManager: EventEmitter, stage: TaskStage, storage: TaskStorageInterface) {
    this.taskManager = taskManager;
    this.stage = stage;
    this.managedTasks = new Map();
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
   * Initialize a task stage
   */
  public async initializeTaskStage(taskId: string, options: SubTaskStageOptions): Promise<void> {
    this.ensureInitialized();

    try {
      const task = await this.getTaskOrThrow(taskId);
      await this.onInitializeTaskStage(task, options);
      await this.updateStageState(taskId, StageState.PENDING);
    } catch (error) {
      await this.handleError('initializeTaskStage', error);
      throw error;
    }
  }

  /**
   * Start a task stage
   */
  public async startTaskStage(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStageStateTransition(task.stages[this.stage].state, StageState.IN_PROGRESS)) {
        throw new Error(`Invalid stage state transition from ${task.stages[this.stage].state} to ${StageState.IN_PROGRESS}`);
      }

      await this.onStartTaskStage(task);
      await this.updateStageState(taskId, StageState.IN_PROGRESS);
    } catch (error) {
      await this.handleError('startTaskStage', error);
      throw error;
    }
  }

  /**
   * Pause a task stage
   */
  public async pauseTaskStage(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStageStateTransition(task.stages[this.stage].state, StageState.IN_PROGRESS)) {
        throw new Error(`Invalid stage state transition from ${task.stages[this.stage].state} to ${StageState.IN_PROGRESS}`);
      }

      await this.onPauseTaskStage(task);
      // Note: We keep the stage in IN_PROGRESS state when paused
    } catch (error) {
      await this.handleError('pauseTaskStage', error);
      throw error;
    }
  }

  /**
   * Resume a task stage
   */
  public async resumeTaskStage(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      await this.onResumeTaskStage(task);
      // Stage remains in IN_PROGRESS state
    } catch (error) {
      await this.handleError('resumeTaskStage', error);
      throw error;
    }
  }

  /**
   * Complete a task stage
   */
  public async completeTaskStage(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStageStateTransition(task.stages[this.stage].state, StageState.COMPLETED)) {
        throw new Error(`Invalid stage state transition from ${task.stages[this.stage].state} to ${StageState.COMPLETED}`);
      }

      await this.onCompleteTaskStage(task);
      await this.updateStageState(taskId, StageState.COMPLETED);
    } catch (error) {
      await this.handleError('completeTaskStage', error);
      throw error;
    }
  }

  /**
   * Fail a task stage
   */
  public async failTaskStage(taskId: string, error?: Error): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      if (!this.validateStageStateTransition(task.stages[this.stage].state, StageState.FAILED)) {
        throw new Error(`Invalid stage state transition from ${task.stages[this.stage].state} to ${StageState.FAILED}`);
      }

      await this.onFailTaskStage(task, error);
      await this.updateStageState(taskId, StageState.FAILED, error);
    } catch (err) {
      await this.handleError('failTaskStage', err);
      throw err;
    }
  }

  /**
   * Cancel a task stage
   */
  public async cancelTaskStage(taskId: string): Promise<void> {
    this.ensureInitialized();
    const task = this.getTaskOrThrow(taskId);

    try {
      await this.onCancelTaskStage(task);
      await this.updateStageState(taskId, StageState.FAILED);
    } catch (error) {
      await this.handleError('cancelTaskStage', error);
      throw error;
    }
  }

  /**
   * Get a managed task
   */
  public getManagedTask(taskId: string): UnifiedTask | undefined {
    return this.managedTasks.get(taskId);
  }

  /**
   * Get all managed tasks
   */
  public getManagedTasks(): UnifiedTask[] {
    return Array.from(this.managedTasks.values());
  }

  /**
   * Get the stage this manager handles
   */
  public getStage(): TaskStage {
    return this.stage;
  }

  /**
   * Update stage progress
   */
  protected async updateStageProgress(taskId: string, progress: number, detail?: string): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    
    task.stages[this.stage].progress = progress;
    task.metadata.updatedAt = Date.now();

    // Emit stage progress event
    const event: StageProgressUpdatedEvent = {
      type: TaskEventType.STAGE_PROGRESS_UPDATED,
      taskId,
      timestamp: Date.now(),
      stage: this.stage,
      progress,
      detail
    };

    await this.emitTaskEvent(event);
    await this.storage.saveTask(task);
  }

  /**
   * Update stage state
   */
  public async updateStageState(taskId: string, newState: StageState, error?: Error): Promise<void> {
    const task = this.getTaskOrThrow(taskId);
    const previousState = task.stages[this.stage].state;
    
    task.stages[this.stage].state = newState;
    task.stages[this.stage].error = error;
    
    if (newState === StageState.IN_PROGRESS && !task.stages[this.stage].startTime) {
      task.stages[this.stage].startTime = Date.now();
    } else if (newState === StageState.COMPLETED || newState === StageState.FAILED) {
      task.stages[this.stage].endTime = Date.now();
    }
    
    task.metadata.updatedAt = Date.now();

    // Emit stage state change event
    const event: StageStateChangedEvent = {
      type: TaskEventType.STAGE_STATE_CHANGED,
      taskId,
      timestamp: Date.now(),
      stage: this.stage,
      previousState,
      newState
    };

    await this.emitTaskEvent(event);
    await this.handleStageStateChange(taskId, newState);
    await this.storage.saveTask(task);
  }

  /**
   * Validate stage state transition
   */
  protected validateStageStateTransition(currentState: StageState, newState: StageState): boolean {
    // Define valid state transitions
    const validTransitions: Record<StageState, StageState[]> = {
      [StageState.PENDING]: [StageState.IN_PROGRESS, StageState.SKIPPED, StageState.CANCELLED],
      [StageState.IN_PROGRESS]: [StageState.COMPLETED, StageState.FAILED, StageState.PENDING, StageState.CANCELLED],
      [StageState.COMPLETED]: [], // Final state
      [StageState.FAILED]: [StageState.PENDING, StageState.CANCELLED], // Can retry or cancel
      [StageState.SKIPPED]: [], // Final state
      [StageState.CANCELLED]: [StageState.IN_PROGRESS] // Can restart
    };

    return validTransitions[currentState]?.includes(newState) || false;
  }

  /**
   * Check if stage is in final state
   */
  protected isStageInFinalState(state: StageState): boolean {
    return state === StageState.COMPLETED || state === StageState.FAILED || state === StageState.SKIPPED;
  }

  /**
   * Handle errors
   */
  protected async handleError(operation: string, error: any): Promise<void> {
    const taskId = this.extractTaskIdFromError(error);
    
    console.error(`Error in ${this.stage} manager during ${operation}:`, error);
    
    if (taskId) {
      const event: TaskErrorEvent = {
        type: TaskEventType.ERROR_OCCURRED,
        taskId,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
        errorCode: operation
      };
      
      await this.emitTaskEvent(event);
    }
  }

  /**
   * Extract task ID from error
   */
  protected extractTaskIdFromError(_error: any): string | undefined {
    // Override in subclasses if needed
    return undefined;
  }

  /**
   * Emit task event
   */
  protected async emitTaskEvent(event: TaskEvent): Promise<void> {
    this.taskManager.emit('taskEvent', event);
  }

  /**
   * Get task or throw error
   */
  protected getTaskOrThrow(taskId: string): UnifiedTask {
    const task = this.managedTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }

  /**
   * Add task to managed tasks
   */
  public addManagedTask(task: UnifiedTask): void {
    this.managedTasks.set(task.id, task);
  }

  /**
   * Remove task from managed tasks
   */
  protected removeManagedTask(taskId: string): void {
    this.managedTasks.delete(taskId);
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.stage} manager is not initialized`);
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;
  protected abstract onInitializeTaskStage(task: UnifiedTask, options: SubTaskStageOptions): Promise<void>;
  protected abstract onStartTaskStage(task: UnifiedTask): Promise<void>;
  protected abstract onPauseTaskStage(task: UnifiedTask): Promise<void>;
  protected abstract onResumeTaskStage(task: UnifiedTask): Promise<void>;
  protected abstract onCompleteTaskStage(task: UnifiedTask): Promise<void>;
  protected abstract onFailTaskStage(task: UnifiedTask, error?: Error): Promise<void>;
  protected abstract onCancelTaskStage(task: UnifiedTask): Promise<void>;
  protected abstract handleStageStateChange(taskId: string, newState: StageState): Promise<void>;
} 