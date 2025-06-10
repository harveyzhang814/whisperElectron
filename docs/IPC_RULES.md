# IPC 处理程序实现规则

## 1. 基本结构

每个 IPC 处理程序的实现都需要遵循以下基本结构：

```typescript
// 1. 导入必要的依赖
import { ipcMain } from 'electron';
import * as fs from 'fs';
import { SomeType } from '../renderer/types/someType';

// 2. 定义必要的状态变量
let someState = false;

// 3. 实现 IPC 处理函数
export function setupSomeIPC() {
  ipcMain.handle('some:action', async (_: unknown, ...args: any[]) => {
    try {
      // 实现逻辑
      return { success: true, data: result };
    } catch (error) {
      console.error('Error in some:action:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
```

## 2. 类型定义

### 2.1 渲染进程类型定义
在 `src/renderer/types/electron.d.ts` 中定义接口：

```typescript
interface ElectronAPI {
  // 方法名: (参数类型) => 返回类型
  someAction: (param1: string, param2: number) => Promise<{ success: boolean; data?: any; error?: string }>;
}
```

### 2.2 主进程类型定义
在 `src/main/types/someType.ts` 中定义类型：

```typescript
export interface SomeType {
  // 类型定义
  field1: string;
  field2: number;
}
```

## 3. 预加载脚本

在 `src/preload.ts` 中暴露方法：

```typescript
contextBridge.exposeInMainWorld('electron', {
  // 方法名: (参数) => ipcRenderer.invoke('channel:name', 参数)
  someAction: (param1: string, param2: number) => 
    ipcRenderer.invoke('some:action', param1, param2),
});
```

## 4. 实现步骤检查清单

在实现新的 IPC 处理程序时，请按以下步骤检查：

1. 类型定义
   - [ ] 在 `src/renderer/types/electron.d.ts` 中添加方法定义
   - [ ] 在 `src/main/types/` 中添加必要的类型定义
   - [ ] 确保所有类型都被正确导出和导入

2. 预加载脚本
   - [ ] 在 `src/preload.ts` 中暴露方法
   - [ ] 确保方法名和参数类型与类型定义匹配
   - [ ] 确保 channel 名称正确

3. 主进程实现
   - [ ] 导入所有必要的依赖
   - [ ] 定义必要的状态变量
   - [ ] 实现 IPC 处理函数
   - [ ] 添加适当的错误处理
   - [ ] 返回标准化的响应格式

4. 渲染进程使用
   - [ ] 使用正确的类型注解
   - [ ] 实现适当的错误处理
   - [ ] 处理异步操作

## 5. 常见错误和解决方案

### 5.1 类型错误
- 错误：`Cannot find name 'ipcMain'`
- 解决：添加 `import { ipcMain } from 'electron';`

### 5.2 模块导入错误
- 错误：`Cannot find module '../renderer/types/someType'`
- 解决：确保类型文件存在且路径正确

### 5.3 参数类型错误
- 错误：`Parameter '_' implicitly has an 'any' type`
- 解决：使用 `_: unknown` 或具体的类型

### 5.4 方法未定义错误
- 错误：`window.electron.someMethod is not a function`
- 解决：检查预加载脚本中是否正确暴露了方法

## 6. 最佳实践

1. 命名规范
   - Channel 名称使用 `domain:action` 格式
   - 方法名使用 camelCase
   - 类型名使用 PascalCase

2. 错误处理
   - 始终使用 try-catch 包装异步操作
   - 返回标准化的错误响应
   - 在控制台记录错误详情

3. 类型安全
   - 为所有参数和返回值定义类型
   - 使用 TypeScript 的严格模式
   - 避免使用 `any` 类型

4. 代码组织
   - 相关的 IPC 处理程序放在同一个文件中
   - 使用清晰的注释说明功能
   - 保持代码结构一致

## 7. 示例

### 7.1 完整的 IPC 实现示例

```typescript
// src/main/someManager.ts
import { ipcMain } from 'electron';
import { SomeType } from '../renderer/types/someType';

export function setupSomeIPC() {
  ipcMain.handle('some:action', async (_: unknown, param1: string, param2: number) => {
    try {
      // 实现逻辑
      return { success: true, data: result };
    } catch (error) {
      console.error('Error in some:action:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
```

### 7.2 完整的类型定义示例

```typescript
// src/renderer/types/electron.d.ts
interface ElectronAPI {
  someAction: (param1: string, param2: number) => 
    Promise<{ success: boolean; data?: any; error?: string }>;
}
```

### 7.3 完整的预加载脚本示例

```typescript
// src/preload.ts
contextBridge.exposeInMainWorld('electron', {
  someAction: (param1: string, param2: number) => 
    ipcRenderer.invoke('some:action', param1, param2),
});
``` 