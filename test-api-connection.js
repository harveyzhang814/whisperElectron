const fetch = require('node-fetch');

async function testAPI() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('测试 Whisper Docker API 连接...\n');
  
  try {
    // 测试健康检查
    console.log('1. 测试健康检查...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log(`   响应: ${JSON.stringify(healthData)}`);
    
    // 测试模型列表
    console.log('\n2. 测试模型列表...');
    const modelsResponse = await fetch(`${baseUrl}/models`);
    const modelsData = await modelsResponse.json();
    console.log(`   响应: ${JSON.stringify(modelsData)}`);
    
    // 测试转写端点
    console.log('\n3. 测试转写端点...');
    const transcribeResponse = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'base',
        audio_file: null
      })
    });
    console.log(`   状态码: ${transcribeResponse.status}`);
    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.log(`   错误: ${errorText}`);
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testAPI();
