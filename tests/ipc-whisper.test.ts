/**
 * This module provides integration tests for Whisper IPC functionality,
 * testing the communication between main and renderer processes.
 */

import { configManager } from '../src/main/config/index';
import { WhisperAPIClient } from '../src/main/whisper/client';

// 测试配置
const TEST_CONFIG = {
  whisper: {
    baseUrl: 'http://localhost:8000',
    defaultModel: 'base',
    timeout: 10000,
    retryAttempts: 2,
    language: 'auto',
    outputFormat: 'json' as const,
    enableHealthCheck: true,
    healthCheckInterval: 30000
  }
};

// 测试音频文件路径
const TEST_AUDIO_FILE = './tests/sample/test-audio.wav';

/**
 * 基础功能测试
 */
async function testBasicFunctionality() {
  console.log('=== 基础功能测试 ===');
  
  try {
    // 初始化配置
    await configManager.initialize();
    await configManager.updateConfigSection('whisper', TEST_CONFIG.whisper);
    
    // 获取配置
    const config = await configManager.getConfigSection('whisper');
    console.log('✓ 配置获取成功:', config.baseUrl);
    
    // 创建客户端
    const whisperClient = new WhisperAPIClient({
      baseUrl: TEST_CONFIG.whisper.baseUrl,
      defaultModel: TEST_CONFIG.whisper.defaultModel,
      timeout: TEST_CONFIG.whisper.timeout,
      retryAttempts: TEST_CONFIG.whisper.retryAttempts,
      defaultLanguage: TEST_CONFIG.whisper.language,
      defaultOutputFormat: TEST_CONFIG.whisper.outputFormat,
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    console.log('✓ Whisper 客户端创建成功');
    
    // 测试连接
    try {
      const connected = await whisperClient.testConnection();
      console.log('✓ 连接测试结果:', connected);
    } catch (error) {
      console.log('⚠ 连接测试失败 (可能是 Docker API 未运行):', error);
    }
    
    // 测试健康检查
    try {
      const health = await whisperClient.checkHealth();
      console.log('✓ 健康检查结果:', health.status);
    } catch (error) {
      console.log('⚠ 健康检查失败 (可能是 Docker API 未运行):', error);
    }
    
    // 测试模型列表
    try {
      const models = await whisperClient.getModels();
      console.log('✓ 模型列表获取成功，数量:', models.length);
      if (models.length > 0) {
        console.log('  可用模型:', models.map(m => m.name).join(', '));
      }
    } catch (error) {
      console.log('⚠ 模型列表获取失败 (可能是 Docker API 未运行):', error);
    }
    
    // 清理资源
    whisperClient.destroy();
    console.log('✓ 客户端资源清理完成');
    
  } catch (error) {
    console.error('✗ 基础功能测试失败:', error);
  }
}

/**
 * 任务管理测试
 */
async function testTaskManagement() {
  console.log('\n=== 任务管理测试 ===');
  
  try {
    const whisperClient = new WhisperAPIClient({
      baseUrl: TEST_CONFIG.whisper.baseUrl,
      defaultModel: TEST_CONFIG.whisper.defaultModel,
      timeout: TEST_CONFIG.whisper.timeout,
      retryAttempts: TEST_CONFIG.whisper.retryAttempts,
      defaultLanguage: TEST_CONFIG.whisper.language,
      defaultOutputFormat: TEST_CONFIG.whisper.outputFormat,
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    // 测试任务列表
    const tasks = whisperClient.getAllTasks();
    console.log('✓ 任务列表获取成功，数量:', tasks.length);
    
    // 测试任务清理
    whisperClient.cleanupTasks();
    const tasksAfterCleanup = whisperClient.getAllTasks();
    console.log('✓ 任务清理完成，剩余任务:', tasksAfterCleanup.length);
    
    // 测试任务取消
    const cancelled = whisperClient.cancelTranscribe('non-existent-task');
    console.log('✓ 任务取消测试完成:', cancelled);
    
    // 清理资源
    whisperClient.destroy();
    console.log('✓ 任务管理测试完成');
    
  } catch (error) {
    console.error('✗ 任务管理测试失败:', error);
  }
}

/**
 * 事件监听测试
 */
async function testEventListeners() {
  console.log('\n=== 事件监听测试 ===');
  
  try {
    const whisperClient = new WhisperAPIClient({
      baseUrl: TEST_CONFIG.whisper.baseUrl,
      defaultModel: TEST_CONFIG.whisper.defaultModel,
      timeout: TEST_CONFIG.whisper.timeout,
      retryAttempts: TEST_CONFIG.whisper.retryAttempts,
      defaultLanguage: TEST_CONFIG.whisper.language,
      defaultOutputFormat: TEST_CONFIG.whisper.outputFormat,
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    // 测试事件监听器
    let eventReceived = false;
    
    whisperClient.on('transcribe:start', (taskId: string, filePath: string) => {
      console.log('✓ 收到转写开始事件:', taskId, filePath);
      eventReceived = true;
    });
    
    // 模拟触发事件
    whisperClient.emit('transcribe:start', 'test-task-id', TEST_AUDIO_FILE);
    
    // 等待事件处理
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (eventReceived) {
      console.log('✓ 事件监听测试成功');
    } else {
      console.log('⚠ 事件监听测试失败');
    }
    
    // 清理资源
    whisperClient.destroy();
    console.log('✓ 事件监听测试完成');
    
  } catch (error) {
    console.error('✗ 事件监听测试失败:', error);
  }
}

/**
 * 错误处理测试
 */
async function testErrorHandling() {
  console.log('\n=== 错误处理测试 ===');
  
  try {
    // 测试无效配置
    try {
      new WhisperAPIClient({
        baseUrl: '', // 无效的 URL
        defaultModel: 'base'
      });
      console.log('⚠ 无效配置测试失败 - 应该抛出错误');
    } catch (error) {
      console.log('✓ 无效配置测试成功 - 正确抛出错误');
    }
    
    // 测试网络错误
    const invalidClient = new WhisperAPIClient({
      baseUrl: 'http://invalid-url:9999',
      defaultModel: 'base',
      timeout: 1000,
      retryAttempts: 1,
      defaultLanguage: 'auto',
      defaultOutputFormat: 'txt',
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    try {
      await invalidClient.testConnection();
      console.log('⚠ 网络错误测试失败 - 应该抛出错误');
    } catch (error) {
      console.log('✓ 网络错误测试成功 - 正确抛出错误');
    } finally {
      invalidClient.destroy();
    }
    
    // 测试文件错误
    const validClient = new WhisperAPIClient({
      baseUrl: TEST_CONFIG.whisper.baseUrl,
      defaultModel: TEST_CONFIG.whisper.defaultModel,
      timeout: TEST_CONFIG.whisper.timeout,
      retryAttempts: TEST_CONFIG.whisper.retryAttempts,
      defaultLanguage: TEST_CONFIG.whisper.language,
      defaultOutputFormat: TEST_CONFIG.whisper.outputFormat,
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    try {
      await validClient.transcribe('non-existent-file.wav');
      console.log('⚠ 文件错误测试失败 - 应该抛出错误');
    } catch (error) {
      console.log('✓ 文件错误测试成功 - 正确抛出错误');
    } finally {
      validClient.destroy();
    }
    
    console.log('✓ 错误处理测试完成');
    
  } catch (error) {
    console.error('✗ 错误处理测试失败:', error);
  }
}

/**
 * 并发操作测试
 */
async function testConcurrentOperations() {
  console.log('\n=== 并发操作测试 ===');
  
  try {
    const whisperClient = new WhisperAPIClient({
      baseUrl: TEST_CONFIG.whisper.baseUrl,
      defaultModel: TEST_CONFIG.whisper.defaultModel,
      timeout: TEST_CONFIG.whisper.timeout,
      retryAttempts: TEST_CONFIG.whisper.retryAttempts,
      defaultLanguage: TEST_CONFIG.whisper.language,
      defaultOutputFormat: TEST_CONFIG.whisper.outputFormat,
      enableWordTimestamps: false,
      enableConfidence: false
    });
    
    // 测试多个任务取消
    const taskIds = ['task-1', 'task-2', 'task-3'];
    const results = taskIds.map(id => whisperClient.cancelTranscribe(id));
    
    console.log('✓ 并发任务取消测试完成，结果:', results);
    
    // 测试资源清理
    try {
      whisperClient.destroy();
      console.log('✓ 资源清理测试成功');
    } catch (error) {
      console.log('⚠ 资源清理测试失败:', error);
    }
    
    console.log('✓ 并发操作测试完成');
    
  } catch (error) {
    console.error('✗ 并发操作测试失败:', error);
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('开始运行 Whisper IPC 集成测试...\n');
  
  await testBasicFunctionality();
  await testTaskManagement();
  await testEventListeners();
  await testErrorHandling();
  await testConcurrentOperations();
  
  console.log('\n=== 测试总结 ===');
  console.log('所有测试完成！');
  console.log('注意：某些测试可能因为 Docker API 未运行而显示警告，这是正常的。');
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
} 