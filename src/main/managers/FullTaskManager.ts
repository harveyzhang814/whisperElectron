import { EventEmitter } from 'events';
import {
  BaseTask,
  TaskState,
  TaskEvent,
  TaskEventType,
  TaskManagerConfig,
  TaskMetadata,
  TaskFilterOptions,
  TaskSortOptions,
  TaskEventHandler,
  TaskStateChangedEvent,
  TaskProgressUpdatedEvent
} from '../types/task';
import { TaskStorageInterface } from '../types/storage';
import { SQLiteTaskStorage } from '../storage/SQLiteTaskStorage';
import { BaseSubTaskManager } from './BaseSubTaskManager';
import { 
  ConcurrencyConfig, 
  TaskTypeConcurrencyConfig, 
  TaskPriority 
} from '../types/concurrency';
import { PriorityTaskQueue } from './PriorityTaskQueue';

/**
 * 类型安全的子任务管理器注册表
 */
export interface SubTaskManagerRegistry {
  [key: string]: BaseSubTaskManager<any>;
}

/**
 * FullTaskManager 类负责管理系统中的所有任务。
 * 实现单例模式以确保只存在一个实例。
 */
export class FullTaskManager extends EventEmitter {
  private static instance: FullTaskManager; // 单例实例
  private tasks: Map<string, BaseTask>; // 任务映射表
  private config: TaskManagerConfig; // 任务管理器配置
  private storage: TaskStorageInterface; // 存储接口
  private subTaskManagers: SubTaskManagerRegistry; // 子任务管理器注册表
  private concurrencyConfigs: TaskTypeConcurrencyConfig; // 并发配置
  private taskQueues: Map<string, PriorityTaskQueue>; // 任务队列映射表

  private constructor(config: TaskManagerConfig) {
    super(); // 调用EventEmitter的构造函数
    this.tasks = new Map();
    this.config = config;
    this.storage = new SQLiteTaskStorage();
    this.subTaskManagers = {};
    this.concurrencyConfigs = {};
    this.taskQueues = new Map();

    // 设置默认的全局并发配置
    this.concurrencyConfigs['_global'] = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      currentRunningTasks: 0
    };

    // 监听任务状态变化事件
    this.on('taskEvent', (event: TaskEvent) => {
      if (event.type === TaskEventType.STATE_CHANGED) {
        const stateEvent = event as TaskStateChangedEvent;
        this.handleTaskStateChange(stateEvent).catch(error => {
          console.error('Error handling task state change:', error);
        });
      }
    });
  }

  /**
   * 初始化任务管理器
   * 从存储中加载所有任务并初始化内部状态
   */
  public async initialize(): Promise<void> {
    await this.storage.initialize();
    const tasks = await this.storage.loadAllTasks();
    tasks.forEach(task => this.tasks.set(task.id, task));
    
    // Note: Sub-task managers will be initialized when they are registered
    // and will restore their own historical tasks
  }

  /**
   * 获取 FullTaskManager 的单例实例
   * @param config 可选的任务管理器配置
   * @returns FullTaskManager 实例
   */
  public static async getInstance(config?: TaskManagerConfig): Promise<FullTaskManager> {
    if (!FullTaskManager.instance) {
      if (!config) {
        throw new Error('Configuration must be provided when creating FullTaskManager instance');
      }
      FullTaskManager.instance = new FullTaskManager(config);
      await FullTaskManager.instance.initialize();
    }
    return FullTaskManager.instance;
  }

  /**
   * 注册子任务管理器，带有类型检查
   * @param type 任务类型
   * @param manager 子任务管理器实例
   */
  public registerSubTaskManager<T extends BaseTask>(
    type: string,
    manager: BaseSubTaskManager<T>
  ): void {
    if (this.subTaskManagers[type]) {
      throw new Error(`SubTaskManager for type ${type} already registered`);
    }
    this.subTaskManagers[type] = manager;
    
    // Initialize the sub-task manager after registration
    manager.initialize().catch(error => {
      console.error(`Failed to initialize ${type} manager:`, error);
    });
  }

  /**
   * 获取已注册的子任务管理器，带有类型检查
   * @param type 任务类型
   * @returns 子任务管理器实例或 undefined
   */
  public getSubTaskManager<T extends BaseTask>(
    type: string
  ): BaseSubTaskManager<T> | undefined {
    const manager = this.subTaskManagers[type];
    if (!manager) {
      return undefined;
    }
    return manager as BaseSubTaskManager<T>;
  }

  /**
   * 创建任务，带有类型检查
   * @param type 任务类型
   * @param metadata 任务元数据
   * @returns 创建的任务实例
   */
  public async createTask<T extends BaseTask>(
    type: string,
    metadata: TaskMetadata
  ): Promise<T> {
    const manager = this.getSubTaskManager<T>(type);
    if (!manager) {
      throw new Error(`No manager registered for task type: ${type}`);
    }

    const task = await this.createBaseTask(type, metadata);
    return manager.createTask(task.id, {
      name: metadata.name,
      description: metadata.description,
      tags: metadata.tags
    }) as Promise<T>;
  }

  /**
   * 创建基础任务
   * @param type 任务类型
   * @param metadata 任务元数据
   * @returns 创建的基础任务实例
   */
  private async createBaseTask(
    type: string,
    metadata: TaskMetadata
  ): Promise<BaseTask> {
    const task: BaseTask = {
      id: this.generateTaskId(),
      type,
      state: TaskState.CREATED,
      metadata: {
        ...metadata,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      progress: 0
    };

    await this.storage.saveTask(task);
    this.tasks.set(task.id, task);
    
    await this.emitTaskEvent({
      type: TaskEventType.STATE_CHANGED,
      taskId: task.id,
      timestamp: Date.now(),
      previousState: null as any,
      newState: TaskState.CREATED
    } as TaskStateChangedEvent);

    return task;
  }

  /**
   * 根据ID获取任务
   * @param taskId 任务ID
   * @returns 任务实例或 undefined
   */
  public async getTask(taskId: string): Promise<BaseTask | undefined> {
    // First check if we have the task in memory
    let task = this.tasks.get(taskId);

    // If not in memory, try to load from storage
    if (!task) {
    const storedTask = await this.storage.loadTask(taskId);
    if (storedTask) {
      this.tasks.set(storedTask.id, storedTask);
        task = storedTask;
      }
    }

    // If we found the task, check if there's a more recent version in sub-task managers
    if (task) {
      // Try to get the latest version from the appropriate sub-task manager
      const manager = this.getSubTaskManager(task.type);
      if (manager) {
        const subTask = manager.getTask(taskId);
        if (subTask) {
          // Update our memory with the latest state from sub-task manager
          this.tasks.set(taskId, subTask);
          return subTask;
        }
      }
      return task;
    }

    return undefined;
  }

  /**
   * 获取所有任务，可选择过滤和排序
   * @param filter 过滤选项
   * @param sort 排序选项
   * @returns 任务数组
   */
  public async getTasks(filter?: TaskFilterOptions, sort?: TaskSortOptions): Promise<BaseTask[]> {
    console.log('🔄 [FullTaskManager] Getting all tasks...');
    
    // Ensure all tasks are loaded from storage
    const storedTasks = await this.storage.loadAllTasks();
    console.log('📦 [FullTaskManager] Loaded from storage:', {
      count: storedTasks.length,
      tasks: storedTasks.map(task => ({
        id: task.id,
        type: task.type,
        state: task.state,
        progress: task.progress,
        metadata: task.metadata,
        extendedData: task.extendedData
      }))
    });
    
    storedTasks.forEach(task => {
      if (!this.tasks.has(task.id)) {
        this.tasks.set(task.id, task);
      }
    });

    // Get all tasks from memory and update with latest states from sub-task managers
    const allTasks: BaseTask[] = [];
    
    for (const [taskId, task] of this.tasks.entries()) {
      console.log(`🔍 [FullTaskManager] Processing task ${taskId}:`, {
        type: task.type,
        state: task.state,
        manager: this.getSubTaskManager(task.type) ? 'found' : 'not found'
      });
      
      // Try to get the latest version from the appropriate sub-task manager
      const manager = this.getSubTaskManager(task.type);
      if (manager) {
        const subTask = manager.getTask(taskId);
        console.log(`📋 [FullTaskManager] Sub-task manager result for ${taskId}:`, {
          found: !!subTask,
          state: subTask?.state,
          extendedData: subTask?.extendedData
        });
        
        if (subTask) {
          // Update our memory with the latest state from sub-task manager
          this.tasks.set(taskId, subTask);
          allTasks.push(subTask);
        } else {
          allTasks.push(task);
        }
      } else {
        allTasks.push(task);
      }
    }

    console.log('✅ [FullTaskManager] Final tasks:', {
      count: allTasks.length,
      tasks: allTasks.map(task => ({
        id: task.id,
        type: task.type,
        state: task.state,
        progress: task.progress,
        metadata: task.metadata,
        extendedData: task.extendedData
      }))
    });

    let tasks = allTasks;

    // Apply filters
    if (filter) {
      if (filter.states) {
        tasks = tasks.filter(task => filter.states!.includes(task.state));
      }
      if (filter.types) {
        tasks = tasks.filter(task => filter.types!.includes(task.type));
      }
      if (filter.tags) {
        tasks = tasks.filter(task => 
          task.metadata.tags?.some(tag => filter.tags!.includes(tag))
        );
      }
      if (filter.fromDate) {
        tasks = tasks.filter(task => task.metadata.createdAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        tasks = tasks.filter(task => task.metadata.createdAt <= filter.toDate!);
      }
    }

    // Apply sorting
    if (sort) {
      tasks.sort((a, b) => {
        let aValue: any = sort.field === 'createdAt' || sort.field === 'updatedAt' 
          ? a.metadata[sort.field]
          : sort.field === 'name'
          ? a.metadata.name
          : a[sort.field];
        
        let bValue: any = sort.field === 'createdAt' || sort.field === 'updatedAt'
          ? b.metadata[sort.field]
          : sort.field === 'name'
          ? b.metadata.name
          : b[sort.field];

        return sort.order === 'asc' 
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      });
    }

    return tasks;
  }

  /**
   * 更新任务状态，带有类型检查
   * @param taskId 任务ID
   * @param newState 新状态
   */
  public async updateTaskState<T extends BaseTask>(
    taskId: string,
    newState: TaskState
  ): Promise<void> {
    const task = await this.getTask(taskId) as T;
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const manager = this.getSubTaskManager<T>(task.type);
    if (!manager) {
      throw new Error(`No manager registered for task type: ${task.type}`);
    }

    await manager.updateTaskState(taskId, newState);
  }

  /**
   * 更新任务进度
   * @param taskId 任务ID
   * @param progress 进度值（0-100）
   * @param detail 可选的详细信息
   */
  public async updateTaskProgress(taskId: string, progress: number, detail?: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.progress = Math.max(0, Math.min(100, progress));
    task.metadata.updatedAt = Date.now();

    await this.storage.saveTask(task);
    await this.emitTaskEvent({
      type: TaskEventType.PROGRESS_UPDATED,
      taskId,
      timestamp: Date.now(),
      progress: task.progress,
      detail
    } as TaskProgressUpdatedEvent);
  }

  /**
   * 删除任务，带有类型检查
   * @param taskId 任务ID
   */
  public async deleteTask<T extends BaseTask>(taskId: string): Promise<void> {
    const task = await this.getTask(taskId) as T;
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const manager = this.getSubTaskManager<T>(task.type);
    if (!manager) {
      throw new Error(`No manager registered for task type: ${task.type}`);
    }

    await manager.deleteTask(taskId);
    await this.storage.deleteTask(taskId);
    this.tasks.delete(taskId);
    
    await this.emitTaskEvent({
      type: TaskEventType.TASK_DELETED,
      taskId,
      timestamp: Date.now()
    });
  }

  /**
   * 订阅任务事件
   * @param handler 事件处理函数
   */
  public subscribeToTaskEvents(handler: TaskEventHandler): void {
    this.on('taskEvent', handler);
  }

  /**
   * 取消订阅任务事件
   * @param handler 事件处理函数
   */
  public unsubscribeFromTaskEvents(handler: TaskEventHandler): void {
    this.off('taskEvent', handler);
  }

  /**
   * 清理已完成的任务
   * 根据配置的保留期自动删除已完成的任务
   */
  public async cleanupCompletedTasks(): Promise<void> {
    if (!this.config.autoCleanupCompleted) {
      return;
    }

    const now = Date.now();
    const tasksToDelete: string[] = [];

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        task.state === TaskState.COMPLETED &&
        this.config.retentionPeriod &&
        now - task.metadata.updatedAt > this.config.retentionPeriod
      ) {
        tasksToDelete.push(taskId);
      }
    }

    if (tasksToDelete.length > 0) {
      await this.storage.deleteTasks(tasksToDelete);
      tasksToDelete.forEach(taskId => this.tasks.delete(taskId));
    }
  }

  /**
   * 生成唯一的任务ID
   * @returns 生成的任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发送任务事件
   * @param event 任务事件对象
   */
  private async emitTaskEvent(event: TaskEvent): Promise<void> {
    this.emit('taskEvent', event);
  }

  /**
   * 获取存储实例（供子任务管理器使用）
   * @returns 存储接口实例
   */
  public getStorage(): TaskStorageInterface {
    return this.storage;
  }

  /**
   * 关闭任务管理器并清理资源
   */
  public async close(): Promise<void> {
    await this.storage.close();
  }

  /**
   * 设置特定任务类型的并发配置
   * @param taskType 任务类型
   * @param maxConcurrent 最大并发数
   */
  public setTaskTypeConcurrency(taskType: string, maxConcurrent: number): void {
    this.concurrencyConfigs[taskType] = {
      maxConcurrentTasks: maxConcurrent,
      currentRunningTasks: 0
    };
    
    // 初始化任务队列
    if (!this.taskQueues.has(taskType)) {
      this.taskQueues.set(taskType, new PriorityTaskQueue());
    }
  }

  /**
   * 获取任务类型的并发配置
   * @param taskType 任务类型
   * @returns 并发配置
   */
  private getTaskTypeConcurrency(taskType: string): ConcurrencyConfig {
    return this.concurrencyConfigs[taskType] || this.concurrencyConfigs['_global'];
  }

  /**
   * 检查任务是否可以开始执行
   * @param taskType 任务类型
   * @returns 是否可以开始执行
   */
  private canStartTask(taskType: string): boolean {
    const concurrency = this.getTaskTypeConcurrency(taskType);
    return concurrency.currentRunningTasks < concurrency.maxConcurrentTasks;
  }

  /**
   * 将任务添加到队列
   * @param task 任务实例
   * @param priority 任务优先级
   */
  private enqueueTask(task: BaseTask, priority: TaskPriority = TaskPriority.NORMAL): void {
    let queue = this.taskQueues.get(task.type);
    if (!queue) {
      queue = new PriorityTaskQueue();
      this.taskQueues.set(task.type, queue);
    }
    queue.enqueue(task, priority);
  }

  /**
   * 从队列中获取下一个任务
   * @param taskType 任务类型
   * @returns 任务实例或 undefined
   */
  private dequeueTask(taskType: string): BaseTask | undefined {
    const queue = this.taskQueues.get(taskType);
    return queue?.dequeue();
  }

  /**
   * 处理任务状态变化
   * @param event 状态变化事件
   */
  private async handleTaskStateChange(event: TaskStateChangedEvent): Promise<void> {
    const task = await this.getTask(event.taskId);
    if (!task) return;

    const concurrency = this.getTaskTypeConcurrency(task.type);

    // 更新运行中的任务计数
    if (event.newState === TaskState.RUNNING) {
      concurrency.currentRunningTasks++;
    } else if (this.isTaskFinished(event.newState)) {
      concurrency.currentRunningTasks--;
      
      // 检查队列中是否有等待的任务
      await this.processTaskQueue(task.type);
    }
  }

  /**
   * 处理任务队列
   * 尝试启动队列中等待的任务
   * @param taskType 任务类型
   */
  private async processTaskQueue(taskType: string): Promise<void> {
    while (this.canStartTask(taskType)) {
      const nextTask = this.dequeueTask(taskType);
      if (!nextTask) break;

      const manager = this.getSubTaskManager(nextTask.type);
      if (manager) {
        try {
          await manager.startTask(nextTask.id);
        } catch (error) {
          console.error(`Failed to start task ${nextTask.id}:`, error);
          // 如果启动失败，更新任务状态为失败
          await this.updateTaskState(nextTask.id, TaskState.FAILED);
        }
      }
    }
  }

  /**
   * 检查任务是否处于终止状态
   * @param state 任务状态
   * @returns 是否已终止
   */
  private isTaskFinished(state: TaskState): boolean {
    return [
      TaskState.COMPLETED,
      TaskState.FAILED,
      TaskState.CANCELLED
    ].includes(state);
  }

  /**
   * 启动任务（带并发控制）
   * @param taskId 任务ID
   * @param priority 任务优先级
   */
  public async startTask<T extends BaseTask>(
    taskId: string,
    priority: TaskPriority = TaskPriority.NORMAL
  ): Promise<void> {
    const task = await this.getTask(taskId) as T;
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const manager = this.getSubTaskManager<T>(task.type);
    if (!manager) {
      throw new Error(`No manager registered for task type: ${task.type}`);
    }

    if (this.canStartTask(task.type)) {
      await manager.startTask(taskId);
    } else {
      this.enqueueTask(task, priority);
      await this.emitTaskEvent({
        type: TaskEventType.STATE_CHANGED,
        taskId,
        timestamp: Date.now(),
        previousState: task.state,
        newState: TaskState.INITIALIZING
      } as TaskStateChangedEvent);
    }
  }

  /**
   * 获取任务队列统计信息
   * @param taskType 任务类型
   * @returns 队列统计信息
   */
  public getQueueStats(taskType: string): any {
    const queue = this.taskQueues.get(taskType);
    if (!queue) {
      return {
        totalTasks: 0,
        byPriority: {
          [TaskPriority.CRITICAL]: 0,
          [TaskPriority.HIGH]: 0,
          [TaskPriority.NORMAL]: 0,
          [TaskPriority.LOW]: 0
        }
      };
    }
    return queue.getStats();
  }

  /**
   * 取消队列中的任务
   * @param taskId 任务ID
   * @returns 是否成功取消
   */
  public cancelQueuedTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const queue = this.taskQueues.get(task.type);
    if (!queue) return false;

    const removed = queue.remove(taskId);
    if (removed) {
      this.updateTaskState(taskId, TaskState.CANCELLED).catch(error => {
        console.error(`Failed to update task state for ${taskId}:`, error);
      });
    }
    return removed;
  }
}