# WhisperElectron 应用设计文档

## 项目概述
WhisperElectron 是一个基于 Electron 和 React 的桌面应用，主要用于在 macOS 上进行录音和语音转录。应用支持全局快捷键触发录音，并在录音结束后自动进行转录。

## 技术栈
- Electron: 用于构建跨平台桌面应用
- React: 用于构建用户界面
- TypeScript: 提供类型安全
- Node.js: 用于后端服务
- SQLite: 用于本地数据存储
- FFmpeg: 用于音频处理
- Whisper API: 用于语音转录

## 系统架构

### 核心模块划分

1. **快捷键监听模块 (GlobalShortcut)**
   - 负责监听全局快捷键
   - 触发录音开始和结束
   - 与主进程通信
   - **实现方式：使用 Electron 官方 globalShortcut 模块，跨平台支持全局快捷键监听，无需第三方二进制依赖。支持应用最小化或后台运行时捕获快捷键。**
   - **每个快捷键项以 action 作为唯一 id，前后端所有操作、渲染、更新均以 action 唯一定位，避免 key 变动导致的同步和渲染问题。**
   - **用户修改快捷键、启用/禁用时，主进程会自动注销旧快捷键并注册新快捷键，保证全局监听始终与设置同步。**

2. **录音模块 (AudioRecorder)**
   - 处理音频录制
   - 音频格式转换
   - 临时文件管理

3. **API 通信模块 (APIClient)**
   - 处理与 Whisper API 的通信
   - 管理 API 密钥
   - 处理请求和响应

4. **转录处理模块 (TranscriptionProcessor)**
   - 处理转录结果
   - 文本格式化
   - 结果存储

5. **任务管理与历史记录模块（TaskManager）**
   - 负责管理所有录音任务（包括计划、录音中、已完成）
   - 任务信息持久化存储于 SQLite 数据库
   - 支持任务的创建、状态流转、编辑、历史查询
   - 支持录音文件路径、时长等元数据的管理

6. **UI 模块 (React Components)**
   - 应用设置界面
   - 录音状态显示
   - 转录结果展示
   - 历史记录管理

### 数据流
1. 用户按下快捷键 → 触发录音
2. 录音模块开始录制
3. 用户再次按下快捷键 → 停止录音
4. 录音文件保存并发送到 API
5. API 返回转录结果
6. 转录结果处理和展示

## 详细设计

### 1. 快捷键监听模块

#### 核心类设计

##### ShortcutManager 类
```typescript
class ShortcutManager {
  private shortcuts: Map<ShortcutAction, ShortcutConfig>;
  private isRecording: boolean;
}
```

#### 配置接口
```typescript
interface ShortcutConfig {
  action: ShortcutAction;    // 快捷键动作
  key: string;              // 快捷键组合
  description: string;      // 描述
  enabled: boolean;         // 是否启用
}

enum ShortcutAction {
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  CANCEL_RECORDING = 'CANCEL_RECORDING',
}
```

#### 核心功能实现

1. **快捷键管理**
   - `initializeShortcuts()`: 初始化快捷键配置
     - 加载默认配置
     - 注册启用的快捷键
   
   - `registerAllShortcuts()`: 注册所有启用的快捷键
     - 先注销所有快捷键
     - 重新注册启用状态的快捷键
   
   - `updateShortcut()`: 更新快捷键配置
     - 检查快捷键冲突
     - 注销旧快捷键
     - 注册新快捷键
     - 更新配置状态

2. **默认配置**
   ```typescript
   const DEFAULT_SHORTCUTS = [
     {
       action: ShortcutAction.START_RECORDING,
       key: 'CommandOrControl+Shift+R',
       description: '开始录音',
       enabled: true,
     },
     {
       action: ShortcutAction.STOP_RECORDING,
       key: 'CommandOrControl+Shift+S',
       description: '停止录音',
       enabled: true,
     },
     {
       action: ShortcutAction.CANCEL_RECORDING,
       key: 'CommandOrControl+Shift+C',
       description: '取消录音',
       enabled: true,
     },
   ];
   ```

3. **状态管理**
   - 维护录音状态
   - 快捷键配置状态
   - 快捷键注册状态
   - 冲突检测状态

4. **事件处理**
   - 快捷键触发事件处理
   - 状态变更通知
   - 错误处理和恢复

#### 进程通信设计

1. **IPC 通道**
   ```typescript
   // 主进程
   ipcMain.handle('shortcuts:get', () => {...});
   ipcMain.handle('shortcuts:update', (_, action, config) => {...});
   ```

2. **渲染进程 API**
   ```typescript
   window.electron = {
     getShortcuts: () => ipcRenderer.invoke('shortcuts:get'),
     updateShortcut: (action, config) => ipcRenderer.invoke('shortcuts:update', action, config)
   };
   ```

#### 用户界面设计

1. **快捷键设置组件**
   - 显示所有可配置的快捷键
   - 支持快捷键修改
   - 支持启用/禁用切换
   - 实时预览和反馈

2. **交互设计**
   - 点击开始录制快捷键
   - 等待用户按下新组合键
   - 显示录制状态
   - 保存并应用新快捷键

#### 错误处理机制

1. **注册错误**
   - 快捷键被占用
   - 无效的快捷键组合
   - 注册失败恢复

2. **冲突处理**
   - 检测快捷键冲突
   - 阻止重复注册
   - 提供冲突反馈

#### 生命周期管理

1. **初始化**
   - 应用启动时初始化
   - 加载默认配置
   - 注册可用快捷键

2. **清理**
   - 应用退出时注销所有快捷键
   - 保存配置状态
   - 释放资源

#### 性能优化

1. **资源管理**
   - 及时注销未使用的快捷键
   - 避免重复注册
   - 优化状态更新

2. **状态同步**
   - 使用 Map 结构提高查询效率
   - 原子操作确保状态一致性
   - 异步操作的正确处理

#### 安全考虑

1. **权限管理**
   - 使用 Electron globalShortcut 模块
   - 无需额外的系统权限
   - 安全的快捷键注册机制

2. **数据保护**
   - 安全的配置存储
   - 防止快捷键冲突
   - 用户配置的保护

#### 扩展性设计

1. **动作支持**
   - 可扩展的快捷键动作
   - 灵活的配置接口
   - 支持自定义动作

2. **平台兼容**
   - 跨平台快捷键支持
   - 平台特定的快捷键映射
   - 可配置的按键组合

### 2. 录音模块

#### 核心类设计

##### AudioRecorder 类
```typescript
class AudioRecorder {
  private isRecording: boolean;
  private currentRecordingPath: string | null;
  private config: AudioConfig;
  private fileStream: WriteStream | null;
  private recInstance: any;
}
```

#### 配置接口
```typescript
interface AudioConfig {
  format: 'wav' | 'mp3';      // 音频格式
  sampleRate: number;         // 采样率 (默认 44100Hz)
  channels: number;          // 声道数 (默认 2)
  bitDepth: number;         // 位深度 (默认 16)
}
```

#### 核心功能实现

1. **录音控制**
   - `startRecording()`: 开始录音
     - 检查是否已在录音
     - 创建临时文件目录
     - 生成唯一文件名
     - 初始化录音实例
     - 创建文件写入流
     - 错误处理和状态管理
   
   - `stopRecording()`: 停止录音
     - 停止录音实例
     - 关闭文件流
     - 重置状态
     - 返回录音文件路径
   
   - `cancelRecording()`: 取消录音
     - 停止录音
     - 删除临时文件
     - 重置状态

2. **配置管理**
   - `updateConfig()`: 更新录音配置
   - 默认配置：
     ```typescript
     const DEFAULT_AUDIO_CONFIG = {
       format: 'wav',
       sampleRate: 44100,
       channels: 2,
       bitDepth: 16
     };
     ```

3. **状态管理**
   - `getStatus()`: 获取当前录音状态
   - 状态包含：
     - isRecording: 是否正在录音
     - currentRecordingPath: 当前录音文件路径

4. **文件管理**
   - 临时文件存储：`app.getPath('temp')/whisper-electron/`
   - 文件命名格式：`recording-{timestamp}.wav`
   - 自动清理机制：任务删除时自动删除对应音频文件

#### 进程通信设计

1. **IPC 通道**
   ```typescript
   // 主进程到渲染进程
   ipcMain.handle('audio:start', async () => {...});
   ipcMain.handle('audio:stop', async () => {...});
   ipcMain.handle('audio:cancel', async () => {...});
   ipcMain.handle('audio:getStatus', () => {...});
   ipcMain.handle('audio:updateConfig', (_, config) => {...});
   ipcMain.handle('audio:deleteFile', async (_, audioPath) => {...});
   ```

2. **渲染进程 API**
   ```typescript
   window.electron = {
     startRecording: () => ipcRenderer.invoke('audio:start'),
     stopRecording: () => ipcRenderer.invoke('audio:stop'),
     cancelRecording: () => ipcRenderer.invoke('audio:cancel'),
     getRecordingStatus: () => ipcRenderer.invoke('audio:getStatus'),
     updateAudioConfig: (config) => ipcRenderer.invoke('audio:updateConfig', config),
     deleteAudioFile: (audioPath) => ipcRenderer.invoke('audio:deleteFile', audioPath)
   };
   ```

#### 错误处理机制

1. **录音错误**
   - 设备权限错误
   - 文件系统错误
   - 录音设备错误
   - 状态不一致错误

2. **恢复机制**
   - 错误发生时自动清理资源
   - 重置录音状态
   - 删除不完整的临时文件
   - 通知用户错误信息

#### 与任务管理的集成

1. **任务状态同步**
   - 开始录音时创建或更新任务
   - 停止录音时更新任务状态和音频路径
   - 取消录音时重置任务状态

2. **生命周期管理**
   - 应用退出时自动停止录音
   - 窗口关闭时保存录音
   - 任务删除时清理音频文件

#### 性能优化

1. **资源管理**
   - 使用流式处理避免内存溢出
   - 及时释放不需要的资源
   - 自动清理临时文件

2. **状态同步**
   - 使用原子操作确保状态一致性
   - 避免竞态条件
   - 异步操作的正确处理

#### 安全考虑

1. **文件安全**
   - 使用安全的临时目录
   - 唯一文件名生成
   - 适当的文件权限设置

2. **数据保护**
   - 录音文件的安全存储
   - 临时文件的及时清理
   - 用户数据的保护

#### 扩展性设计

1. **格式支持**
   - 当前支持 WAV 格式
   - 预留 MP3 格式支持
   - 可扩展的音频配置接口

2. **设备支持**
   - 支持多种录音程序（sox, rec, arecord）
   - 可配置的设备选择
   - 跨平台兼容性

### 3. API 通信模块

#### API 配置
- API 密钥管理
- 模型选择
- 语言设置
- 请求超时设置

#### 通信机制
- 异步请求处理
- 错误重试机制
- 响应解析
- 结果缓存

### 4. 转录处理模块

#### 结果处理
- 文本格式化
- 时间戳处理
- 分段处理
- 标点符号优化

#### 存储管理
- 本地存储
- 历史记录
- 导出功能
- 数据备份

### 5. 任务管理与历史记录模块（TaskManager）
- 负责管理所有录音任务（包括计划、录音中、已完成）
- 任务信息持久化存储于 SQLite 数据库
- 支持任务的创建、状态流转、编辑、历史查询
- 支持录音文件路径、时长等元数据的管理

#### 任务模型
- id：唯一标识（UUID/hash）
- title：任务标题（可编辑，默认创建时间）
- status：任务状态（backlog/recording/completed）
- createdAt：创建时间
- updatedAt：最后更新时间
- audioPath：音频文件路径（completed 状态下有值）
- duration：音频时长（秒，completed 状态下有值）

#### 任务状态流转
- backlog：计划中，未录音。可编辑标题，可点击"开始录音"
- recording：录音中，显示录音时长。可点击"结束录音"
- completed：已完成，显示音频总时长、文件icon（可打开文件位置），可编辑标题

#### 主要交互流程
- 点击"Start Recording"：自动创建新任务，状态为 recording，立即开始录音，任务出现在列表顶部
- 点击"Create Memo Task"：创建新任务，状态为 backlog，未自动录音，需手动点击"开始录音"
- backlog 任务点击"开始录音"：切换为 recording，开始录音
- recording 任务点击"结束录音"：切换为 completed，记录音频路径和时长
- completed 任务点击文件icon：用 Electron shell 打开音频文件所在目录
- 应用启动时自动从 SQLite 读取所有历史任务，按时间倒序展示

#### 数据持久化
- 使用 SQLite 数据库存储所有任务信息
- 录音文件路径、时长等信息也存入数据库
- 应用启动时自动加载任务列表

## 项目结构
```
whisperElectron/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts         # 主进程入口
│   │   ├── shortcut.ts      # 快捷键管理
│   │   └── audio.ts         # 音频处理
│   ├── renderer/            # React 渲染进程
│   │   ├── App.tsx         # 主应用组件
│   │   ├── components/     # UI 组件
│   │   └── hooks/          # React Hooks
│   └── shared/             # 共享代码
│       ├── types.ts        # 类型定义
│       └── constants.ts    # 常量定义
├── public/                 # 静态资源
├── package.json
└── tsconfig.json
```

## 开发计划

### 第一阶段：基础架构
1. 搭建 Electron + React 项目框架
2. 实现基本的应用窗口和界面
3. 配置开发环境和构建流程

### 第二阶段：核心功能
1. 实现快捷键监听模块
2. 实现录音功能
3. 实现与 Whisper API 的集成

### 第三阶段：UI 和优化
1. 完善用户界面
2. 添加设置功能
3. 实现历史记录管理
4. 优化性能和用户体验

## 注意事项
1. 需要处理 macOS 的权限问题（麦克风访问权限和辅助功能权限）
2. 确保应用在后台运行时能正常响应快捷键
3. 注意音频文件的管理和清理
4. 保护 API 密钥的安全性
5. 考虑网络连接问题时的错误处理
6. 处理快捷键冲突问题
7. 确保系统级快捷键的可靠性
8. 提供权限获取失败时的降级方案
9. 处理快捷键配置的版本兼容性
10. 确保快捷键状态与录音状态的一致性

## 后续优化方向
1. 支持更多音频格式
2. 添加实时转录功能
3. 支持更多语言
4. 添加导出功能
5. 支持自定义快捷键
6. 添加音频编辑功能

## UI 设计

### 设计风格
- 遵循 macOS 原生设计规范
- 使用系统原生控件和交互模式
- 保持简洁、直观的用户界面
- 支持深色/浅色模式自动切换

### 页面结构

#### 1. 主页面 (MainWindow)
- **布局结构**
  - 顶部工具栏
  - 任务列表区域
  - 状态栏

- **顶部工具栏**
  - 录音控制按钮
    - 开始录音按钮（带状态指示）
    - 停止录音按钮
  - 设置按钮（打开设置页面）
  - 当前录音状态指示器

- **任务列表**
  - 分页展示（每页5条）
  - 按时间倒序排列
  - 列表项显示：
    - 任务创建时间
    - 录音时长
    - 转录状态
    - 简短预览文本
  - 点击列表项进入任务详情页
  - 支持下拉刷新
  - 分页导航控件

#### 2. 设置页面 (SettingsWindow)
- **布局结构**
  - 分组设置面板
  - 底部操作按钮

- **API 配置组**
  - API 地址输入框
  - API 端口输入框
  - 测试连接按钮
  - 保存按钮

- **录音配置组**
  - 录音格式选择
    - 单选按钮组
    - 选项：WAV（默认）、MP3
  - 采样率设置
  - 声道设置

- **快捷键配置组**
  - 开始录音快捷键设置
    - 快捷键输入框
    - 重置按钮
  - 结束录音快捷键设置
    - 快捷键输入框
    - 重置按钮
  - 快捷键冲突检测
  - 应用按钮

#### 3. 任务详情页 (TaskDetailWindow)
- **布局结构**
  - 顶部工具栏
  - 内容区域
  - 底部状态栏

- **工具栏**
  - 返回按钮
  - 删除按钮
    - 带确认对话框
  - 打开文件位置按钮
  - 导出按钮

- **信息展示区**
  - 任务 ID 显示
  - 创建时间显示
    - 格式：YYYY-MM-DD HH:mm:ss
  - 录音时长
  - 转录文本区域
    - 支持文本选择
    - 支持复制
    - 支持导出
  - 原始音频播放器
    - 播放/暂停控制
    - 进度条
    - 音量控制

### 交互设计

#### 全局交互
- 支持键盘快捷键导航
- 支持深色模式自动切换
- 窗口大小可调整

#### 状态反馈
- 录音状态实时显示
- 转录状态指示
- 操作成功/失败提示
- 网络状态指示

#### 错误处理
- 友好的错误提示
- 操作确认对话框
- 自动重试机制
- 错误恢复建议

### 响应式设计
- 支持不同窗口尺寸
- 自适应布局
- 合理的空间利用
- 保持界面元素比例

### 后台运行与托盘功能

#### 托盘设计
- **托盘图标**
  - 使用 20x20 像素的图标
  - 支持深色/浅色模式自动切换
  - 图标清晰可辨识

- **托盘菜单**
  - 动态显示录音相关选项
    - 未录音时显示"开始录音"
    - 录音中显示"停止录音"和"取消录音"
  - 固定选项
    - 显示主窗口
    - 设置
    - 退出应用

#### 后台运行机制
- **窗口管理**
  - 点击关闭按钮时最小化到托盘
  - 支持从托盘恢复窗口
  - 保持应用在后台运行

- **状态同步**
  - 托盘菜单状态与录音状态同步
  - 主窗口与托盘状态实时更新
  - 使用 IPC 通信保持状态一致性

- **事件处理**
  - 托盘菜单事件处理
  - 窗口显示/隐藏事件
  - 应用退出事件

#### 用户体验优化
- **状态提示**
  - 托盘图标状态指示
  - 菜单项状态反馈
  - 操作结果通知

- **快捷操作**
  - 托盘菜单快速访问
  - 常用功能一键触发
  - 状态切换便捷

---

**设计亮点：**
- 快捷键项不会因 key 变动丢失或错乱，所有配置项都以 action 唯一标识，前后端同步一致
- 全局快捷键监听无需第三方依赖，跨平台兼容性强，后台运行稳定
- 任务与录音强关联，所有录音文件均有任务元数据可查
- 历史任务可追溯、可管理，便于后续扩展转录、导出等功能
- 托盘功能支持后台运行，提供便捷的操作入口，状态同步准确