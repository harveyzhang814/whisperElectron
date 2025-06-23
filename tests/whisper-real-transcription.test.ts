/**
 * This module provides real audio transcription tests for the WhisperAPIClient class,
 * testing actual transcription with a real audio file.
 */

import { WhisperAPIClient } from '../src/main/whisper/client';
import { WhisperAPIClientConfig } from '../src/main/whisper/types';
import { join } from 'path';

// 测试结果记录
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

class RealTranscriptionTestRunner {
  private results: TestResult[] = [];
  private testCount = 0;
  private passedCount = 0;

  async runTest(name: string, testFn: () => Promise<any> | any): Promise<any> {
    this.testCount++;
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      this.results.push({
        name,
        passed: true,
        duration: Date.now() - startTime,
        details: result
      });
      this.passedCount++;
      console.log(`✅ ${name} - PASSED (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`❌ ${name} - FAILED (${Date.now() - startTime}ms): ${error}`);
      throw error;
    }
  }

  getSummary(): void {
    console.log('\n=== 真实转录测试总结 ===');
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
  timeout: 60000, // 60秒超时（转录可能需要更长时间）
  retryAttempts: 2,
  retryDelay: 1000,
  defaultModel: 'base',
  defaultLanguage: 'auto',
  defaultOutputFormat: 'json',
  enableWordTimestamps: false,
  enableConfidence: false
};

// 获取测试音频文件路径
function getTestAudioFile(): string {
  const testFile = join(__dirname, 'sample', 'test.wav');
  console.log(`测试音频文件: ${testFile}`);
  return testFile;
}

// 主测试函数
async function runRealTranscriptionTests(): Promise<void> {
  const runner = new RealTranscriptionTestRunner();
  
  console.log('开始运行 Whisper 真实音频转录测试...\n');
  console.log('⚠️  请确保本地 Whisper Docker API 已启动并运行在 http://localhost:8000\n');

  let client: WhisperAPIClient | null = null;
  const testAudioFile = getTestAudioFile();

  try {
    // 创建客户端
    client = new WhisperAPIClient(testConfig);
    
    // 测试1: 健康检查
    await runner.runTest('健康检查 - API服务状态', async () => {
      const health = await client!.checkHealth();
      console.log(`  API状态: ${health.status}`);
      console.log(`  API版本: ${health.version || '未知'}`);
      console.log(`  可用模型: ${health.models?.length || 0}个`);
      
      if (health.status !== 'healthy') {
        throw new Error(`API服务不健康: ${health.error || '未知错误'}`);
      }
      
      return health;
    });

    // 测试2: 获取模型列表
    await runner.runTest('模型管理 - 获取可用模型', async () => {
      const models = await client!.getModels();
      console.log(`  发现 ${models.length} 个模型:`);
      models.forEach(model => {
        console.log(`    - ${model.name}${model.description ? ` (${model.description})` : ''}`);
      });
      
      if (models.length === 0) {
        throw new Error('没有找到可用的模型');
      }
      
      return models;
    });

    // 测试3: 使用base模型转录
    await runner.runTest('转录功能 - base模型转录', async () => {
      console.log('  开始使用base模型转录测试音频文件...');
      console.log(`  音频文件: ${testAudioFile}`);
      
      // 先用curl测试API是否正常工作
      console.log('  先用curl测试API...');
      const { execSync } = require('child_process');
      try {
        const curlResult = execSync(`curl -s -F "audio_file=@${testAudioFile}" -F "model=base" http://localhost:8000/transcribe`, { encoding: 'utf8' });
        console.log(`  curl结果: ${curlResult}`);
      } catch (curlError) {
        console.log(`  curl测试失败: ${curlError.message}`);
      }
      
      let progressCount = 0;
      const result = await client!.transcribe(testAudioFile, {
        model: 'base',
        language: 'auto',
        output_format: 'json'
      }, (progress) => {
        progressCount++;
        console.log(`    进度: ${progress.progress}% - ${progress.status} - ${progress.message}`);
      });
      
      console.log('\n=== 转录结果 ===');
      console.log(`文本: "${result.text}"`);
      console.log(`语言: ${result.language || '未知'}`);
      console.log(`进度回调次数: ${progressCount}`);
      
      if (result.segments && result.segments.length > 0) {
        console.log('\n=== 分段详情 ===');
        result.segments.forEach((segment: any, index: number) => {
          console.log(`  段 ${index + 1}: ${segment.start}s - ${segment.end}s`);
          console.log(`    文本: "${segment.text}"`);
          if (segment.avg_logprob) {
            console.log(`    置信度: ${(segment.avg_logprob * 100).toFixed(1)}%`);
          }
        });
      }
      
      if (!result.text || result.text.trim() === '') {
        throw new Error('转录结果为空');
      }
      
      return result;
    });

    // 测试4: 使用small模型转录（如果可用）
    await runner.runTest('转录功能 - small模型转录', async () => {
      const models = await client!.getModels();
      const hasSmallModel = models.some(m => m.name === 'small');
      
      if (!hasSmallModel) {
        console.log('  跳过small模型测试 - 模型不可用');
        return { skipped: true, reason: 'small model not available' };
      }
      
      console.log('  开始使用small模型转录测试音频文件...');
      
      let progressCount = 0;
      const result = await client!.transcribe(testAudioFile, {
        model: 'small',
        language: 'auto',
        output_format: 'json'
      }, (progress) => {
        progressCount++;
        console.log(`    进度: ${progress.progress}% - ${progress.status} - ${progress.message}`);
      });
      
      console.log('\n=== small模型转录结果 ===');
      console.log(`文本: "${result.text}"`);
      console.log(`语言: ${result.language || '未知'}`);
      console.log(`进度回调次数: ${progressCount}`);
      
      if (!result.text || result.text.trim() === '') {
        throw new Error('转录结果为空');
      }
      
      return result;
    });

    // 测试5: 指定语言转录
    await runner.runTest('转录功能 - 指定语言转录', async () => {
      console.log('  开始使用指定语言(zh)转录测试音频文件...');
      
      let progressCount = 0;
      const result = await client!.transcribe(testAudioFile, {
        model: 'base',
        language: 'zh',
        output_format: 'json'
      }, (progress) => {
        progressCount++;
        console.log(`    进度: ${progress.progress}% - ${progress.status} - ${progress.message}`);
      });
      
      console.log('\n=== 指定语言转录结果 ===');
      console.log(`文本: "${result.text}"`);
      console.log(`语言: ${result.language || '未知'}`);
      console.log(`进度回调次数: ${progressCount}`);
      
      if (!result.text || result.text.trim() === '') {
        throw new Error('转录结果为空');
      }
      
      return result;
    });

    // 测试6: 任务管理
    await runner.runTest('任务管理 - 获取任务列表', () => {
      const tasks = client!.getAllTasks();
      console.log(`  当前任务数: ${tasks.length}`);
      
      if (tasks.length === 0) {
        throw new Error('转录后应该至少有一个任务');
      }
      
      console.log('\n=== 任务详情 ===');
      tasks.forEach((task, index) => {
        console.log(`  任务 ${index + 1}:`);
        console.log(`    ID: ${task.id}`);
        console.log(`    状态: ${task.status}`);
        console.log(`    文件: ${task.filePath}`);
        console.log(`    创建时间: ${task.createdAt.toISOString()}`);
        if (task.completedAt) {
          console.log(`    完成时间: ${task.completedAt.toISOString()}`);
        }
        if (task.result) {
          console.log(`    转录文本: "${task.result.text?.substring(0, 100)}${task.result.text && task.result.text.length > 100 ? '...' : ''}"`);
        }
      });
      
      return tasks;
    });

  } catch (error) {
    console.error('真实转录测试设置失败:', error);
  } finally {
    // 清理资源
    if (client) {
      client.destroy();
    }
  }

  // 输出测试总结
  runner.getSummary();
  
  console.log('\n=== 后续步骤建议 ===');
  console.log('✅ 真实转录测试完成！');
  console.log('📝 如果测试成功，说明:');
  console.log('   1. Docker API 转录功能正常');
  console.log('   2. 音频文件格式兼容');
  console.log('   3. 客户端适配器工作正常');
  console.log('   4. 可以集成到主应用中');
}

// 运行测试
if (require.main === module) {
  runRealTranscriptionTests().catch(console.error);
}

export { runRealTranscriptionTests }; 