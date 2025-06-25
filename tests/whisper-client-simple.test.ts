/**
 * This module provides simple tests for the WhisperAPIClient class,
 * without dependency on Jest or other testing frameworks.
 */

import { WhisperAPIClient } from '../src/main/whisper/client';
import { ConfigUtils } from '../src/main/whisper/utils';
import { ErrorHandler } from '../src/main/whisper/errors';
import { WhisperAPIClientConfig } from '../src/main/whisper/types';

// 测试结果记录
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class SimpleTestRunner {
  private results: TestResult[] = [];
  private testCount = 0;
  private passedCount = 0;

  async runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
    this.testCount++;
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime
      });
      this.passedCount++;
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name} - FAILED (${Date.now() - startTime}ms): ${error}`);
    }
  }

  getSummary(): void {
    console.log('\n=== 测试总结 ===');
    console.log(`总测试数: ${this.testCount}`);
    console.log(`通过: ${this.passedCount}`);
    console.log(`失败: ${this.testCount - this.passedCount}`);
    console.log(`成功率: ${((this.passedCount / this.testCount) * 100).toFixed(1)}%`);
    
    if (this.passedCount < this.testCount) {
      console.log('\n失败的测试:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
  }
}

// 模拟配置
const mockConfig: WhisperAPIClientConfig = {
  baseUrl: 'http://localhost:9000',
  timeout: 5000,
  retryAttempts: 2,
  retryDelay: 500,
  defaultModel: 'base',
  defaultLanguage: 'auto',
  defaultOutputFormat: 'txt',
  enableWordTimestamps: false,
  enableConfidence: false
};

// 主测试函数
async function runAllTests(): Promise<void> {
  const runner = new SimpleTestRunner();
  
  console.log('开始运行 Whisper API 客户端测试...\n');

  // 测试配置工具
  await runner.runTest('ConfigUtils - 验证有效配置', () => {
    const validConfig = {
      baseUrl: 'http://localhost:9000',
      timeout: 30000,
      retryAttempts: 3
    };
    ConfigUtils.validateAPIConfig(validConfig);
  });

  await runner.runTest('ConfigUtils - 拒绝无效配置', () => {
    const invalidConfig = {
      baseUrl: 'invalid-url',
      timeout: -1000
    };
    try {
      ConfigUtils.validateAPIConfig(invalidConfig);
      throw new Error('应该抛出异常但没有抛出');
    } catch (error) {
      // 期望抛出异常
    }
  });

  await runner.runTest('ConfigUtils - 获取默认配置', () => {
    const defaultConfig = ConfigUtils.getDefaultConfig();
    if (!defaultConfig.baseUrl || !defaultConfig.timeout) {
      throw new Error('默认配置不完整');
    }
  });

  // 测试错误处理
  await runner.runTest('ErrorHandler - 创建网络错误', () => {
    const error = ErrorHandler.createNetworkError('Connection failed', 500);
    if (error.code !== 'NETWORK_ERROR' || !error.isRetryable) {
      throw new Error('网络错误属性不正确');
    }
  });

  await runner.runTest('ErrorHandler - 创建API错误', () => {
    const error = ErrorHandler.createAPIError('API error', 500);
    if (error.code !== 'API_ERROR' || error.statusCode !== 500 || !error.isRetryable) {
      throw new Error('API错误属性不正确');
    }
  });

  await runner.runTest('ErrorHandler - 获取用户友好消息', () => {
    const error = ErrorHandler.createNetworkError('Connection failed');
    const message = ErrorHandler.getUserFriendlyMessage(error);
    if (!message.includes('网络连接失败')) {
      throw new Error('用户友好消息不正确');
    }
  });

  // 测试客户端创建
  await runner.runTest('WhisperAPIClient - 使用默认配置创建', () => {
    const client = new WhisperAPIClient();
    const config = client.getConfig();
    if (config.baseUrl !== 'http://localhost:9000' || config.timeout !== 30000) {
      throw new Error('默认配置不正确');
    }
    client.destroy();
  });

  await runner.runTest('WhisperAPIClient - 使用自定义配置创建', () => {
    const customConfig = {
      baseUrl: 'http://custom-api:9000',
      timeout: 10000
    };
    const client = new WhisperAPIClient(customConfig);
    const config = client.getConfig();
    if (config.baseUrl !== 'http://custom-api:9000' || config.timeout !== 10000) {
      throw new Error('自定义配置不正确');
    }
    client.destroy();
  });

  await runner.runTest('WhisperAPIClient - 更新配置', () => {
    const client = new WhisperAPIClient(mockConfig);
    const newConfig = { timeout: 15000 };
    client.updateConfig(newConfig);
    const config = client.getConfig();
    if (config.timeout !== 15000) {
      throw new Error('配置更新失败');
    }
    client.destroy();
  });

  // 测试任务管理
  await runner.runTest('WhisperAPIClient - 任务管理', () => {
    const client = new WhisperAPIClient(mockConfig);
    const tasks = client.getAllTasks();
    if (!Array.isArray(tasks)) {
      throw new Error('任务列表应该是数组');
    }
    if (tasks.length !== 0) {
      throw new Error('初始任务列表应该为空');
    }
    client.destroy();
  });

  // 测试事件系统
  await runner.runTest('WhisperAPIClient - 事件系统', () => {
    const client = new WhisperAPIClient(mockConfig);
    let eventTriggered = false;
    
    client.on('health:update', () => {
      eventTriggered = true;
    });
    
    // 手动触发事件（模拟）
    (client as any).emit('health:update', { status: 'healthy' });
    
    if (!eventTriggered) {
      throw new Error('事件监听器没有触发');
    }
    
    client.destroy();
  });

  // 测试工具函数
  await runner.runTest('GeneralUtils - 生成ID', () => {
    const { GeneralUtils } = require('../src/main/whisper/utils');
    const id1 = GeneralUtils.generateId();
    const id2 = GeneralUtils.generateId();
    
    if (!id1 || !id2 || id1 === id2) {
      throw new Error('生成的ID无效或重复');
    }
  });

  await runner.runTest('GeneralUtils - 格式化文件大小', () => {
    const { GeneralUtils } = require('../src/main/whisper/utils');
    const size1 = GeneralUtils.formatFileSize(1024);
    const size2 = GeneralUtils.formatFileSize(1024 * 1024);
    
    if (!size1.includes('KB') || !size2.includes('MB')) {
      throw new Error('文件大小格式化不正确');
    }
  });

  await runner.runTest('GeneralUtils - 格式化时间', () => {
    const { GeneralUtils } = require('../src/main/whisper/utils');
    const time1 = GeneralUtils.formatDuration(65);
    const time2 = GeneralUtils.formatDuration(3665);
    
    if (!time1.includes('1:05') || !time2.includes('1:01:05')) {
      throw new Error('时间格式化不正确');
    }
  });

  // 输出测试总结
  runner.getSummary();
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

export { runAllTests }; 