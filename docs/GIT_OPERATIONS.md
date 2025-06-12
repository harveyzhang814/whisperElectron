# Git 操作指南

本文档详细介绍了项目中使用的 Git 操作，包括已经执行过的操作和您可能需要的其他常用操作。

## 目录

1. [基本操作](#基本操作)
2. [分支管理](#分支管理)
3. [提交管理](#提交管理)
4. [远程仓库操作](#远程仓库操作)
5. [高级操作](#高级操作)
6. [最佳实践](#最佳实践)

## 基本操作

### 初始化仓库

```bash
# 在当前目录初始化 Git 仓库
git init

# 添加所有文件到暂存区
git add .

# 首次提交
git commit -m "Initial commit: Electron app setup with TypeScript and Vite"
```

### 查看状态

```bash
# 查看工作区状态
git status

# 查看提交历史
git log

# 查看最近一次提交的详细信息
git log -1 --stat
```

### 添加和提交更改

```bash
# 添加特定文件
git add filename.js

# 添加所有更改
git add .

# 提交更改
git commit -m "feat: add feature description"
```

## 分支管理

### 创建和切换分支

```bash
# 创建并切换到新分支
git checkout -b fea/feature-name

# 切换到已有分支
git checkout main

# 列出所有分支
git branch
```

### 合并分支

```bash
# 将特性分支合并到主分支（先切换到主分支）
git checkout main
git merge fea/feature-name

# 如果有冲突，解决后继续合并
git add .
git commit -m "Merge feature branch"
```

### 删除分支

```bash
# 删除已合并的分支
git branch -d fea/feature-name

# 强制删除分支（即使未合并）
git branch -D fea/feature-name
```

## 提交管理

### 修改最近一次提交

```bash
# 修改最近一次提交的信息
git commit --amend -m "New commit message"

# 向最近一次提交添加更改
git add forgotten-file.js
git commit --amend --no-edit
```

### 撤销更改

```bash
# 撤销工作区更改（未暂存）
git restore filename.js

# 撤销所有工作区更改
git restore .

# 撤销暂存区更改
git restore --staged filename.js

# 撤销提交（创建新提交来撤销之前的提交）
git revert commit-hash
```

### 查看差异

```bash
# 查看工作区和暂存区的差异
git diff

# 查看暂存区和最近提交的差异
git diff --staged

# 查看两个提交之间的差异
git diff commit1-hash commit2-hash
```

## 远程仓库操作

### 添加远程仓库

```bash
# 添加远程仓库
git remote add origin https://github.com/username/repo-name.git

# 查看远程仓库
git remote -v
```

### 推送和拉取

```bash
# 首次推送到远程仓库并设置上游分支
git push -u origin main

# 后续推送
git push

# 拉取远程更改
git pull

# 拉取但不合并
git fetch
```

### 克隆仓库

```bash
# 克隆远程仓库
git clone https://github.com/username/repo-name.git

# 克隆特定分支
git clone -b branch-name https://github.com/username/repo-name.git
```

## 高级操作

### 暂存更改

```bash
# 暂存当前更改
git stash

# 应用最近的暂存
git stash pop

# 查看所有暂存
git stash list

# 应用特定暂存
git stash apply stash@{n}
```

### 变基操作

```bash
# 在当前分支上变基到主分支
git rebase main

# 交互式变基，可以压缩、重排、删除提交
git rebase -i HEAD~3  # 变基最近3个提交
```

### 标签管理

```bash
# 创建标签
git tag v1.0.0

# 创建带注释的标签
git tag -a v1.0.0 -m "Version 1.0.0"

# 推送标签到远程
git push origin v1.0.0

# 推送所有标签
git push origin --tags
```

## 最佳实践

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` - 新功能
- `fix:` - 修复bug
- `docs:` - 文档更改
- `style:` - 不影响代码含义的更改（空格、格式化等）
- `refactor:` - 既不修复bug也不添加功能的代码更改
- `perf:` - 性能优化
- `test:` - 添加或修正测试
- `build:` - 影响构建系统或外部依赖的更改
- `ci:` - CI配置文件和脚本的更改
- `chore:` - 其他不修改src或test的更改

例如：
```bash
git commit -m "feat: add audio recording feature"
git commit -m "fix: resolve SQLite3 module loading issue"
```

### 分支命名规范

- `main` - 主分支，包含稳定代码
- `fea/feature-name` - 特性分支，用于开发新功能
- `fix/bug-name` - 修复分支，用于修复bug
- `release/version` - 发布分支，用于准备发布

### Git 工作流

1. 从 `main` 分支创建特性分支
2. 在特性分支上开发并提交更改
3. 完成开发后，将 `main` 分支合并到特性分支以解决冲突
4. 创建 Pull Request（如果使用GitHub/GitLab）或直接合并到 `main`
5. 合并后删除特性分支

## 项目中已执行的 Git 操作

1. 初始化仓库并首次提交
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Electron app setup with TypeScript and Vite"
   ```

2. 创建和合并特性分支
   ```bash
   git checkout -b fea/recording-module
   # 开发并提交更改
   git checkout main
   git merge fea/recording-module
   git branch -d fea/recording-module
   ```

3. 修复构建问题
   ```bash
   git add .
   git commit -m "fix: packaging failure due to sqlite"
   ```

## 可能需要的其他 Git 操作

1. 设置远程仓库并推送
   ```bash
   git remote add origin https://github.com/username/whisperElectron.git
   git push -u origin main
   ```

2. 创建发布标签
   ```bash
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   ```

3. 查看特定文件的历史
   ```bash
   git log --follow -p -- filename.js
   ```

4. 撤销错误的合并
   ```bash
   git reset --hard HEAD~1  # 撤销最近一次合并
   ```

5. 从远程分支创建本地分支
   ```bash
   git checkout -b local-branch origin/remote-branch
   ```

---

如有任何 Git 相关问题，请参考此文档或官方 [Git 文档](https://git-scm.com/doc)。 