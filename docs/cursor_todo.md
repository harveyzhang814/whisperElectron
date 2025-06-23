# 托盘功能实现计划

## 功能描述
实现应用在后台运行时通过系统托盘继续工作的功能，包括：
- 应用最小化到系统托盘而不是关闭
- 通过托盘图标和菜单控制应用
- 保持快捷键功能在后台可用

## 实现步骤

### 1. 基础架构
- [x] 创建托盘图标资源
  - [x] 准备 tray-icon.png 文件
  - [x] 放置在 src/assets 目录下

### 2. 主进程修改
- [x] 修改 src/main/index.ts
  - [x] 添加 Tray 相关导入
  - [x] 实现 createTray 函数
  - [x] 修改窗口关闭行为
  - [x] 添加托盘菜单事件处理
  - [x] 完善退出流程

### 3. 类型定义
- [x] 修改 src/renderer/types/electron.d.ts
  - [x] 添加新的 IPC 事件类型定义
  - [x] 添加托盘相关方法类型

### 4. 预加载脚本
- [x] 修改 src/preload.ts
  - [x] 添加新的事件监听器
  - [x] 实现托盘相关方法

### 5. 渲染进程
- [x] 修改 src/renderer/App.tsx
  - [x] 添加托盘菜单事件处理
  - [x] 完善状态管理

## 可能的影响

### 用户体验
- 应用行为改变：关闭按钮变为最小化到托盘
- 新增托盘图标和菜单
- 快捷键在后台可用

### 功能影响
- 录音状态管理需要更完善
- 应用退出流程需要更严谨
- 需要处理托盘图标的清理

### 性能影响
- 应用在后台时仍然占用内存
- 需要管理额外的系统资源

## 测试计划

### 1. 测试窗口最小化到托盘
- [ ] 基本功能测试
  - [ ] 点击窗口关闭按钮，确认窗口隐藏而不是关闭
  - [ ] 检查系统托盘区域是否显示应用图标
  - [ ] 点击托盘图标，确认窗口重新显示
  - [ ] 右键托盘图标，确认菜单正确显示

- [ ] 状态保持测试
  - [ ] 最小化前开始录音，确认录音状态保持
  - [ ] 最小化前停止录音，确认状态正确
  - [ ] 最小化前取消录音，确认状态正确

- [ ] 多窗口测试
  - [ ] 打开多个窗口，确认所有窗口都能正确最小化
  - [ ] 确认托盘图标行为一致

- [ ] 异常情况测试
  - [ ] 快速多次点击关闭按钮
  - [ ] 在录音过程中最小化
  - [ ] 在任务列表操作过程中最小化

### 2. 测试托盘菜单功能
- [ ] 测试开始录音
- [ ] 测试停止录音
- [ ] 测试取消录音
- [ ] 测试应用退出

### 3. 测试后台快捷键
- [ ] 测试开始录音快捷键
- [ ] 测试停止录音快捷键
- [ ] 测试取消录音快捷键

### 4. 测试应用退出流程
- [ ] 测试正常退出
- [ ] 测试强制退出
- [ ] 测试异常退出

### 5. 测试录音状态同步
- [ ] 测试状态更新
- [ ] 测试状态恢复
- [ ] 测试状态清理

### 6. 测试内存占用
- [ ] 测试最小化时内存占用
- [ ] 测试长时间运行内存占用
- [ ] 测试多窗口内存占用

## 注意事项
1. 确保托盘图标资源存在
2. 处理不同平台的托盘行为差异
3. 完善错误处理
4. 确保资源正确清理

## 测试环境要求
1. macOS 系统
2. 开发环境（Vite dev server）
3. 生产环境（打包后的应用）

## 测试工具
1. 开发者工具（DevTools）
2. 活动监视器（Activity Monitor）
3. 系统日志（Console.app）

---

# Whisper Docker API 对接开发计划 ✅ 完成

## 功能描述
将应用与 Whisper Docker API 进行对接，实现本地化的语音转写服务，包括：
- 通过 Settings 界面配置 API 地址和相关参数
- 实现音频文件转写功能
- 支持多种转写模型和语言
- 提供转写状态管理和错误处理

## 实现步骤

### 第一阶段：配置管理基础 ✅ 完成

#### 1. 创建配置管理模块
- [x] 创建 src/main/config/ 目录结构
  - [x] 创建 src/main/config/index.ts - 配置管理主模块
  - [x] 创建 src/main/config/types.ts - 配置类型定义
  - [x] 创建 src/main/config/validation.ts - 配置验证逻辑
  - [x] 创建 src/main/config/storage.ts - 配置存储管理

#### 2. 定义配置类型
- [x] 创建 src/main/types/config.ts
  - [x] 定义 WhisperAPIConfig 接口
  - [x] 定义配置验证规则
  - [x] 定义配置变更事件类型
  - [x] 定义配置错误类型

#### 3. 实现配置管理器
- [x] 实现 ConfigManager 类
  - [x] 配置文件读写功能
  - [x] 配置验证逻辑
  - [x] 配置变更监听
  - [x] 配置迁移功能
  - [x] 配置备份恢复

#### 4. 扩展 Settings 界面
- [x] 修改 src/renderer/components/ApiSettings.tsx
  - [x] 添加 API 配置表单
  - [x] 实现配置保存和加载
  - [x] 添加配置验证提示
  - [x] 添加连接测试功能
  - [x] 添加配置导入导出

#### 5. 配置模块测试
- [x] 创建测试文件
  - [x] 创建 tests/config-simple.test.ts - 简单测试脚本
  - [x] 测试配置验证功能
  - [x] 测试配置存储功能
  - [x] 测试默认配置

### 第二阶段：API 客户端实现 ✅ 完成

#### 1. 创建 Whisper API 客户端
- [x] 创建 src/main/whisper/ 目录结构
  - [x] 创建 src/main/whisper/client.ts - API 客户端主类
  - [x] 创建 src/main/whisper/types.ts - API 相关类型
  - [x] 创建 src/main/whisper/errors.ts - 错误处理
  - [x] 创建 src/main/whisper/utils.ts - 工具函数

#### 2. 实现核心 API 方法
- [x] 实现文件上传转写
  - [x] 支持多种音频格式
  - [x] 实现进度回调
  - [x] 添加错误重试机制
- [x] 实现模型列表获取
- [x] 实现健康检查功能
- [x] 实现连接测试功能

#### 3. 扩展 IPC 接口
- [ ] 修改 src/main/ipc.ts
  - [ ] 添加转写相关 IPC 方法
  - [ ] 添加模型列表获取方法
  - [ ] 添加健康检查方法
- [ ] 修改 src/preload.ts
  - [ ] 暴露新的 IPC 方法
  - [ ] 添加类型定义

#### 4. 集成配置管理
- [x] 在 WhisperAPIClient 中集成配置管理
  - [x] 使用 ConfigManager 获取配置
  - [x] 支持配置热更新
  - [x] 添加配置验证

### 第三阶段：集成测试和优化 ✅ 完成

#### 1. 创建集成测试
- [x] 创建 tests/whisper-integration.test.ts
  - [x] 测试健康检查功能
  - [x] 测试模型列表获取
  - [x] 测试连接测试功能
  - [x] 测试配置更新功能

#### 2. 创建真实音频测试
- [x] 创建 tests/whisper-real-transcription.test.ts
  - [x] 使用真实音频文件测试转写
  - [x] 测试多种模型（base, small）
  - [x] 测试不同语言设置
  - [x] 测试任务管理功能

#### 3. 解决兼容性问题
- [x] 解决 Node.js FormData 兼容性问题
  - [x] 安装 form-data 包
  - [x] 统一使用 form-data.submit 方法
  - [x] 修复 multipart/form-data 边界问题
  - [x] 确保与 curl 行为一致

#### 4. 性能优化
- [x] 优化请求处理
  - [x] 统一 API 请求方法
  - [x] 改进错误处理
  - [x] 优化内存管理
  - [x] 添加任务清理机制

### 第四阶段：文档和部署 ✅ 完成

#### 1. 更新文档
- [x] 创建 CHANGELOG.md
  - [x] 记录所有重要变更
  - [x] 添加技术细节
  - [x] 记录测试结果
- [x] 创建 docs/WHISPER_API_INTEGRATION.md
  - [x] 详细的集成文档
  - [x] 使用示例和最佳实践
  - [x] 故障排除指南
- [x] 更新 cursor_todo.md
  - [x] 标记已完成的任务
  - [x] 记录实现成果

#### 2. 测试验证
- [x] 运行完整测试套件
  - [x] 集成测试：8/8 通过 (100%)
  - [x] 真实转录测试：6/6 通过 (100%)
  - [x] 健康检查：正常工作
  - [x] 模型列表：正常工作
  - [x] 音频转录：正常工作
  - [x] 任务管理：正常工作

## 实现成果总结

### ✅ 已完成的功能
1. **完整的 Whisper API 集成**
   - 支持健康检查、模型列表、音频转录
   - 实时进度跟踪和任务管理
   - 全面的错误处理和重试机制

2. **配置管理系统**
   - 单例模式的配置管理器
   - 事件驱动的配置更新
   - 配置验证和导入导出功能

3. **API 设置界面**
   - React 组件用于配置管理
   - 实时连接测试
   - 验证和错误显示

4. **测试基础设施**
   - 集成测试套件
   - 真实音频转录测试
   - 单元测试和模拟测试

5. **兼容性解决方案**
   - 解决 Node.js FormData 兼容性问题
   - 统一使用 form-data.submit 方法
   - 确保与 curl 行为完全一致

### 🎯 测试结果
- **集成测试**: 8/8 通过 (100%)
- **真实转录测试**: 6/6 通过 (100%)
- **所有核心功能**: 正常工作
- **兼容性**: 与 Docker API 完全兼容

### 📚 文档完善
- **CHANGELOG.md**: 完整的变更记录
- **WHISPER_API_INTEGRATION.md**: 详细的集成文档
- **cursor_todo.md**: 更新的任务状态

## 下一步计划

### 待完成的功能
1. **IPC 集成**
   - 将 Whisper API 客户端集成到主进程 IPC
   - 添加转写相关的 IPC 方法
   - 更新预加载脚本和类型定义

2. **UI 集成**
   - 将转写功能集成到主界面
   - 添加转录结果显示组件
   - 实现进度可视化

3. **录音功能集成**
   - 将录音功能与转写功能结合
   - 实现录音后自动转写
   - 添加批量处理功能

### 技术债务
1. **代码优化**
   - 进一步优化内存使用
   - 改进错误处理机制
   - 添加更多单元测试

2. **功能扩展**
   - 支持更多音频格式
   - 添加流式转录功能
   - 实现高级模型支持

## UI样式重构 - 模态框组件统一样式

### 目标
保持 ApiSettings.tsx 和 ShortcutSettings.tsx 的UI样式一致，提高代码复用性和维护性。

### 实施步骤

- [x] 分析两个组件的现有CSS样式，识别共同部分
- [x] 创建共用的 Modal.css 样式文件
- [x] 将共同的样式（模态框容器、头部、关闭按钮、表单元素等）提取到共用文件
- [x] 更新 ApiSettings.tsx 组件使用新的共用样式
- [x] 更新 ShortcutSettings.tsx 组件使用新的共用样式
- [x] 在 Modal.css 中添加快捷键特有的样式
- [x] 删除不再需要的 ApiSettings.css 文件
- [ ] 删除不再需要的 ShortcutSettings.css 文件（需要手动确认）

### 重构内容

#### 共用的样式类
- `.modal-container` - 模态框容器
- `.modal-header` - 模态框头部
- `.close-button` - 关闭按钮
- `.modal-content` - 模态框内容区域
- `.settings-section` - 设置区域
- `.form-group` - 表单组
- `.btn` - 基础按钮样式
- `.btn-primary` - 主要按钮样式
- `.modal-actions` - 操作按钮区域
- `.message` - 消息提示样式

#### 快捷键特有样式
- `.shortcut-list` - 快捷键列表
- `.shortcut-item` - 快捷键项目
- `.shortcut-controls` - 快捷键控制区域
- `.shortcut-key` - 快捷键按键显示
- `.pulse` - 录制状态动画

### 优势
1. **样式一致性** - 两个设置组件现在使用完全一致的UI样式
2. **代码复用** - 减少了重复的CSS代码
3. **维护性** - 样式修改只需要在一个文件中进行
4. **扩展性** - 新的设置组件可以轻松使用相同的样式系统

### 注意事项
- 保持了原有的功能不变
- 使用了语义化的CSS类名
- 保持了响应式设计
- 添加了详细的CSS注释

---
## UI缺陷修复
### 缺陷描述
在 `ApiSettings.tsx` 中，输入框的边界超出了 `settings-section` 的边界

### 修复步骤
- [x] 分析问题原因（`width: 100%` 未包含 `padding` 和 `border`）
- [x] 在 `Modal.css` 中为输入框和选择框添加 `box-sizing: border-box;` 属性

### 修复效果
- 输入框和选择框现在正确地适应其父容器的宽度，解决了边界溢出问题
- 修复应用于所有使用该样式的组件，确保一致性

---

# Whisper Docker API Integration Development Plan

## Current Branch: fea/transcribe-by-whisper

### Phase 1: Complete API Integration
- [ ] Update remaining components to use new job-related terminology
  - [ ] Review and update `src/main/whisper/manager.ts`
  - [ ] Review and update `src/main/whisper/client.ts`
  - [ ] Review and update `src/main/ipc.ts`
  - [ ] Review and update type definitions in `src/main/whisper/types.ts`

- [ ] Implement API Configuration Management
  - [ ] Create API configuration UI in `ApiSettings.tsx`
  - [ ] Add configuration validation
  - [ ] Implement configuration persistence
  - [ ] Add configuration health check functionality

### Phase 2: Enhanced Error Handling & User Feedback
- [ ] Implement comprehensive error handling
  - [ ] Add specific error types for API-related errors
  - [ ] Implement user-friendly error messages
  - [ ] Add error recovery mechanisms

- [ ] Improve User Feedback
  - [ ] Add loading states for API operations
  - [ ] Implement progress indicators for transcription jobs
  - [ ] Add notification system for job status updates

### Phase 3: Testing & Documentation
- [ ] Write Tests
  - [ ] Unit tests for API client
  - [ ] Integration tests for API communication
  - [ ] End-to-end tests for transcription workflow

- [ ] Update Documentation
  - [ ] Update API integration documentation
  - [ ] Document configuration options
  - [ ] Add troubleshooting guide
  - [ ] Update CHANGELOG.md

### Phase 4: Performance & Optimization
- [ ] Implement Job Queue Management
  - [ ] Add job prioritization
  - [ ] Implement job cancellation
  - [ ] Add retry mechanism for failed jobs

- [ ] Optimize Resource Usage
  - [ ] Implement proper cleanup of completed jobs
  - [ ] Add memory usage monitoring
  - [ ] Optimize API request handling

### Phase 5: Final Review & Release Preparation
- [ ] Code Review
  - [ ] Review all changes for consistency
  - [ ] Check for potential memory leaks
  - [ ] Ensure proper error handling throughout

- [ ] Release Preparation
  - [ ] Update version numbers
  - [ ] Finalize CHANGELOG.md
  - [ ] Prepare release notes
  - [ ] Create release branch 

# Whisper Integration Development Plan

## Current Focus: Task & Job Lifecycle Management

### Phase 1: Core Types and Interfaces
- [ ] Create/Update Type Definitions
  - [ ] In `src/main/types/`
    - [ ] Define `RecordingTaskStatus` enum
    - [ ] Define `TranscriptionJobStatus` enum
    - [ ] Create `TaskStatus` interface
    - [ ] Create `JobStatus` interface
    - [ ] Define event types for status changes
  - [ ] In `src/renderer/types/`
    - [ ] Update `electron.d.ts` with new IPC methods
    - [ ] Add type definitions for UI components

### Phase 2: Main Process Implementation
- [ ] Enhance TaskManager (`src/main/taskManager.ts`)
  - [ ] Add TranscriptionJob management
    - [ ] Create TranscriptionJob class
    - [ ] Implement job status tracking
    - [ ] Add job progress monitoring
  - [ ] Update TaskManager class
    - [ ] Add job management methods
    - [ ] Implement task-to-job transition
    - [ ] Add status query methods
    - [ ] Implement event emission system

- [ ] Update Whisper Integration (`src/main/whisper/`)
  - [ ] Update client.ts
    - [ ] Refactor API calls to use job terminology
    - [ ] Add progress tracking
    - [ ] Enhance error handling
  - [ ] Update manager.ts
    - [ ] Implement job queue management
    - [ ] Add job lifecycle hooks
    - [ ] Implement status synchronization

- [ ] Enhance IPC Layer (`src/main/ipc.ts`)
  - [ ] Add new IPC handlers
    - [ ] Task status queries
    - [ ] Job status queries
    - [ ] Combined status queries
  - [ ] Implement event forwarding
    - [ ] Task status changes
    - [ ] Job status changes
    - [ ] Progress updates

### Phase 3: Renderer Process Implementation
- [ ] Create/Update React Hooks
  - [ ] Enhance `useRecordingTask.ts`
    - [ ] Add job status tracking
    - [ ] Implement progress monitoring
    - [ ] Add error handling
  - [ ] Create `useTranscriptionJob.ts`
    - [ ] Implement job status tracking
    - [ ] Add progress monitoring
    - [ ] Handle error states

- [ ] Update UI Components
  - [ ] Enhance TaskList.tsx
    - [ ] Add job status display
    - [ ] Show progress indicators
    - [ ] Improve error handling
  - [ ] Update WhisperTest.tsx
    - [ ] Refactor to use new job terminology
    - [ ] Add job status testing
    - [ ] Enhance error display

### Phase 4: Testing
- [ ] Unit Tests
  - [ ] Test TaskManager
    - [ ] Test task-to-job transition
    - [ ] Test status management
    - [ ] Test event emission
  - [ ] Test TranscriptionJob
    - [ ] Test status transitions
    - [ ] Test progress tracking
    - [ ] Test error handling

- [ ] Integration Tests
  - [ ] Test full recording-to-transcription flow
  - [ ] Test error recovery scenarios
  - [ ] Test concurrent operations
  - [ ] Test IPC communication

### Phase 5: Documentation & Polish
- [ ] Update Documentation
  - [ ] Document new types and interfaces
  - [ ] Add flow diagrams
  - [ ] Update API documentation
  - [ ] Add usage examples

- [ ] Code Quality
  - [ ] Add comprehensive error logging
  - [ ] Implement proper cleanup
  - [ ] Add performance monitoring
  - [ ] Review error handling

## Implementation Order

1. Start with Phase 1 - Core Types
   - This provides the foundation for all other changes
   - Ensures type safety throughout the implementation

2. Move to Phase 2 - Main Process
   - Begin with TaskManager enhancements
   - Then update Whisper integration
   - Finally implement IPC changes

3. Proceed to Phase 3 - Renderer Process
   - Start with hooks implementation
   - Then update UI components

4. Complete Phase 4 - Testing
   - Write tests as features are implemented
   - Focus on critical paths first

5. Finish with Phase 5 - Documentation
   - Document as we go
   - Final polish and review

## Key Files to Modify

```
src/
├── main/
│   ├── taskManager.ts
│   ├── ipc.ts
│   ├── types/
│   │   ├── task.ts
│   │   └── job.ts
│   └── whisper/
│       ├── client.ts
│       └── manager.ts
├── renderer/
│   ├── hooks/
│   │   ├── useRecordingTask.ts
│   │   └── useTranscriptionJob.ts
│   ├── components/
│   │   ├── TaskList.tsx
│   │   └── WhisperTest.tsx
│   └── types/
│       └── electron.d.ts
└── tests/
    ├── taskManager.test.ts
    └── whisper-integration.test.ts
```

## Success Criteria
- [ ] Recording tasks smoothly transition to transcription jobs
- [ ] Real-time status updates are properly propagated
- [ ] Error handling is comprehensive and user-friendly
- [ ] Progress reporting is accurate and responsive
- [ ] Resource cleanup is properly handled
- [ ] Type safety is maintained throughout the system 