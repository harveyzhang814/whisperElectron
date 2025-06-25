import { BaseTask } from '../types/task';
import { TaskQueue, QueuedTask, TaskPriority } from '../types/concurrency';

/**
 * Priority queue implementation for task management
 */
export class PriorityTaskQueue implements TaskQueue {
  private queue: QueuedTask[];

  constructor() {
    this.queue = [];
  }

  /**
   * Add a task to the queue with priority
   */
  public enqueue(task: BaseTask, priority: TaskPriority = TaskPriority.NORMAL): void {
    const queuedTask: QueuedTask = {
      task,
      priority,
      queuedAt: Date.now()
    };

    // Find the correct position to insert the task based on priority
    const insertIndex = this.queue.findIndex(item => 
      item.priority < queuedTask.priority || 
      (item.priority === queuedTask.priority && item.queuedAt > queuedTask.queuedAt)
    );

    if (insertIndex === -1) {
      this.queue.push(queuedTask);
    } else {
      this.queue.splice(insertIndex, 0, queuedTask);
    }
  }

  /**
   * Remove and return the highest priority task
   */
  public dequeue(): BaseTask | undefined {
    const item = this.queue.shift();
    return item?.task;
  }

  /**
   * Look at the highest priority task without removing it
   */
  public peek(): BaseTask | undefined {
    return this.queue[0]?.task;
  }

  /**
   * Check if the queue is empty
   */
  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get the number of tasks in the queue
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Remove all tasks from the queue
   */
  public clear(): void {
    this.queue = [];
  }

  /**
   * Remove a specific task from the queue
   */
  public remove(taskId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.task.id !== taskId);
    return this.queue.length < initialLength;
  }

  /**
   * Get all tasks in the queue
   */
  public getTasks(): BaseTask[] {
    return this.queue.map(item => item.task);
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    return {
      totalTasks: this.queue.length,
      byPriority: {
        [TaskPriority.CRITICAL]: this.queue.filter(item => item.priority === TaskPriority.CRITICAL).length,
        [TaskPriority.HIGH]: this.queue.filter(item => item.priority === TaskPriority.HIGH).length,
        [TaskPriority.NORMAL]: this.queue.filter(item => item.priority === TaskPriority.NORMAL).length,
        [TaskPriority.LOW]: this.queue.filter(item => item.priority === TaskPriority.LOW).length
      },
      oldestTask: this.queue.length > 0 ? Math.min(...this.queue.map(item => item.queuedAt)) : undefined,
      newestTask: this.queue.length > 0 ? Math.max(...this.queue.map(item => item.queuedAt)) : undefined
    };
  }
}

interface QueueStats {
  totalTasks: number;
  byPriority: Record<TaskPriority, number>;
  oldestTask?: number;
  newestTask?: number;
} 