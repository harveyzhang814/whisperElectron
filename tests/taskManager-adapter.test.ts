/**
 * TaskManager适配器测试脚本
 * 测试新的TaskManager系统的基本功能
 */

import { app } from 'electron';
import * as path from 'path';
import { initializeNewTaskManager, TaskManager, closeTaskManager } from '../src/main/taskManagerAdapter';

// 模拟Electron环境
const mockApp = {
  getPath: (name: string) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return path.join(__dirname, 'test-data');
  }
};

// 模拟全局对象
(global as any).app = mockApp;

async function testTaskManagerAdapter() {
  console.log('开始测试TaskManager适配器...\n');

  try {
    // 1. 测试初始化
    console.log('1. 测试初始化...');
    await initializeNewTaskManager();
    console.log('✅ 初始化成功\n');

    // 2. 测试创建任务
    console.log('2. 测试创建任务...');
    const task1 = await TaskManager.createTask('测试任务1', 'backlog');
    console.log('✅ 创建任务成功:', task1.id);
    
    const task2 = await TaskManager.createTask('测试任务2', 'recording');
    console.log('✅ 创建录音任务成功:', task2.id);
    console.log('');

    // 3. 测试获取所有任务
    console.log('3. 测试获取所有任务...');
    const allTasks = await TaskManager.getAllTasks();
    console.log('✅ 获取所有任务成功，共', allTasks.length, '个任务');
    allTasks.forEach(task => {
      console.log(`  - ${task.title} (${task.status})`);
    });
    console.log('');

    // 4. 测试获取单个任务
    console.log('4. 测试获取单个任务...');
    const retrievedTask = await TaskManager.getTask(task1.id);
    if (retrievedTask) {
      console.log('✅ 获取单个任务成功:', retrievedTask.title);
    } else {
      console.log('❌ 获取单个任务失败');
    }
    console.log('');

    // 5. 测试获取当前录音任务
    console.log('5. 测试获取当前录音任务...');
    const currentRecordingTask = await TaskManager.getCurrentRecordingTask();
    if (currentRecordingTask) {
      console.log('✅ 获取当前录音任务成功:', currentRecordingTask.title);
    } else {
      console.log('⚠️ 没有正在进行的录音任务');
    }
    console.log('');

    // 6. 测试更新任务
    console.log('6. 测试更新任务...');
    await TaskManager.updateTask(task1.id, { status: 'completed' });
    const updatedTask = await TaskManager.getTask(task1.id);
    if (updatedTask && updatedTask.status === 'completed') {
      console.log('✅ 更新任务状态成功');
    } else {
      console.log('❌ 更新任务状态失败');
    }
    console.log('');

    // 7. 测试删除任务
    console.log('7. 测试删除任务...');
    await TaskManager.deleteTask(task1.id);
    const deletedTask = await TaskManager.getTask(task1.id);
    if (!deletedTask) {
      console.log('✅ 删除任务成功');
    } else {
      console.log('❌ 删除任务失败');
    }
    console.log('');

    // 8. 测试清理
    console.log('8. 测试清理...');
    await closeTaskManager();
    console.log('✅ 清理成功\n');

    console.log('🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    await closeTaskManager();
  }
}

// 运行测试
if (require.main === module) {
  testTaskManagerAdapter().catch(console.error);
}

export { testTaskManagerAdapter }; 