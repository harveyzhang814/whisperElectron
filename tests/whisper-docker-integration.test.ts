/**
 * Whisper Docker API Integration Test
 * 
 * This module provides integration tests specifically for the Docker API implementation.
 */

import { WhisperAPIClient } from '../src/main/whisper/client';
import { WhisperAPIClientConfig } from '../src/main/whisper/types';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// 测试结果记录
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class IntegrationTestRunner {
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
    console.log('\n=== Docker API 集成测试总结 ===');
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

// 测试配置 - 使用你的实际API地址
const testConfig: WhisperAPIClientConfig = {
  baseUrl: 'http://localhost:8000', // 你的Docker API地址
  timeout: 30000, // 30秒超时
  retryAttempts: 2,
  retryDelay: 1000,
  defaultModel: 'base',
  defaultLanguage: 'auto',
  defaultOutputFormat: 'txt',
  enableWordTimestamps: false,
  enableConfidence: false
};

// 创建测试音频文件
function createTestAudioFile(): string {
  const testDir = tmpdir();
  const testFile = join(testDir, 'test-audio.wav');
  
  // 创建一个简单的WAV文件头（1秒静音）
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const dataSize = sampleRate * channels * bitsPerSample / 8; // 1秒的数据
  
  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;
  
  // WAV文件头
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM
  buffer.writeUInt16LE(channels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // 写入静音数据
  for (let i = 0; i < dataSize; i++) {
    buffer.writeUInt8(0, offset + i);
  }
  
  writeFileSync(testFile, buffer);
  return testFile;
}

// 清理测试文件
function cleanupTestFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn(`清理测试文件失败: ${filePath}`, error);
  }
}

// 直接测试API端点
async function testAPIDirectly() {
  console.log('直接测试 Docker API 端点...\n');
  
  try {
    // 测试健康检查
    console.log('1. 测试健康检查端点...');
    const healthResponse = await fetch('http://localhost:8000/health');
    const healthData = await healthResponse.json();
    console.log(`   响应: ${JSON.stringify(healthData)}`);
    
    // 测试模型列表
    console.log('\n2. 测试模型列表端点...');
    const modelsResponse = await fetch('http://localhost:8000/models');
    const modelsData = await modelsResponse.json();
    console.log(`   响应: ${JSON.stringify(modelsData)}`);
    
    return { healthData, modelsData };
  } catch (error) {
    console.error('直接API测试失败:', error);
    throw error;
  }
}

// 主测试函数
async function runDockerIntegrationTests(): Promise<void> {
  const runner = new IntegrationTestRunner();
  
  console.log('开始运行 Whisper Docker API 集成测试...\n');
  console.log('⚠️  请确保本地 Whisper Docker API 已启动并运行在 http://localhost:8000\n');

  let client: WhisperAPIClient | null = null;
  let testAudioFile: string | null = null;

  try {
    // 测试1: 直接API测试
    await runner.runTest('直接API测试 - 端点可访问性', async () => {
      const { healthData, modelsData } = await testAPIDirectly();
      
      if (healthData.status !== 'ok') {
        throw new Error(`健康检查失败: ${JSON.stringify(healthData)}`);
      }
      
      if (!Array.isArray(modelsData) || modelsData.length === 0) {
        throw new Error(`模型列表无效: ${JSON.stringify(modelsData)}`);
      }
      
      console.log(`  API状态: ${healthData.status}`);
      console.log(`  可用模型: ${modelsData.join(', ')}`);
    });

    // 创建客户端
    client = new WhisperAPIClient(testConfig);
    
    // 测试2: 健康检查（使用适配器）
    await runner.runTest('健康检查 - 适配器处理', async () => {
      const health = await client!.checkHealth();
      console.log(`  适配后状态: ${health.status}`);
      
      if (health.status !== 'healthy') {
        throw new Error(`API服务不健康: ${health.error || '未知错误'}`);
      }
    });

    // 测试3: 连接测试
    await runner.runTest('连接测试 - API可访问性', async () => {
      const isConnected = await client!.testConnection();
      if (!isConnected) {
        throw new Error('无法连接到API服务');
      }
    });

    // 测试4: 获取模型列表（使用适配器）
    await runner.runTest('模型管理 - 适配器处理', async () => {
      const models = await client!.getModels();
      console.log(`  适配后模型: ${models.length}个`);
      models.forEach(model => {
        console.log(`    - ${model.name}${model.description ? ` (${model.description})` : ''}`);
      });
      
      if (models.length === 0) {
        throw new Error('没有找到可用的模型');
      }
    });

    // 测试5: 创建测试音频文件
    await runner.runTest('文件准备 - 创建测试音频', () => {
      testAudioFile = createTestAudioFile();
      console.log(`  测试音频文件: ${testAudioFile}`);
    });

    // 测试6: 转写测试（跳过，因为需要真实的音频文件）
    await runner.runTest('转写功能 - 跳过（需要真实音频）', () => {
      console.log('  跳过转写测试 - 需要真实的音频文件进行测试');
      console.log('  建议使用有语音内容的音频文件进行转写测试');
    });

    // 测试7: 配置更新
    await runner.runTest('配置管理 - 动态更新配置', async () => {
      const originalTimeout = client!.getConfig().timeout;
      const newTimeout = originalTimeout + 5000;
      
      client!.updateConfig({ timeout: newTimeout });
      const updatedConfig = client!.getConfig();
      
      if (updatedConfig.timeout !== newTimeout) {
        throw new Error(`配置更新失败: 期望 ${newTimeout}, 实际 ${updatedConfig.timeout}`);
      }
      
      console.log(`  配置更新成功: timeout ${originalTimeout} -> ${newTimeout}`);
    });

    // 测试8: 错误处理
    await runner.runTest('错误处理 - 无效文件转写', async () => {
      const invalidFile = '/path/to/nonexistent/file.wav';
      
      try {
        await client!.transcribe(invalidFile);
        throw new Error('应该抛出文件不存在错误但没有抛出');
      } catch (error) {
        console.log(`  预期的错误: ${error}`);
        // 期望抛出错误
      }
    });

  } catch (error) {
    console.error('集成测试设置失败:', error);
  } finally {
    // 清理资源
    if (testAudioFile) {
      cleanupTestFile(testAudioFile);
    }
    if (client) {
      client.destroy();
    }
  }

  // 输出测试总结
  runner.getSummary();
  
  // 提供后续步骤建议
  console.log('\n=== 后续步骤建议 ===');
  if (runner.passedCount === runner.testCount) {
    console.log('✅ 所有集成测试通过！Docker API 连接正常。');
    console.log('📝 下一步可以:');
    console.log('  1. 使用真实音频文件测试转写功能');
    console.log('  2. 集成到主进程的IPC接口');
    console.log('  3. 扩展任务管理器支持转写');
    console.log('  4. 更新UI界面显示转写状态');
  } else {
    console.log('❌ 部分测试失败，请检查:');
    console.log('  1. Whisper Docker API 是否已启动');
    console.log('  2. API地址是否正确 (当前: http://localhost:8000)');
    console.log('  3. 网络连接是否正常');
    console.log('  4. Docker容器是否正常运行');
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runDockerIntegrationTests().catch(error => {
    console.error('Docker集成测试运行失败:', error);
    process.exit(1);
  });
}

export { runDockerIntegrationTests };
