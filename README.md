# Collab Docs — 多人协同富文本编辑器（前端）

基于自定义 mini-quill 编辑器核心 + Yjs CRDT + WebSocket 的在线协作文档系统。

> **后端仓库：** [github.com/XIAOSHUAI-Y/doc-backend](https://github.com/XIAOSHUAI-Y/doc-backend.git)

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 y-Doc                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ React 页面  │  │ MiniQuill    │  │ Yjs + WebSocket     │ │
│  │ Home/Editor │  │ 编辑器核心   │  │ 协同同步            │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┴─────────────────────┘            │
│                          │                                  │
│                   Vite 构建 + GitHub Pages                   │
└──────────────────────────┼──────────────────────────────────┘
                           │ WebSocket
┌──────────────────────────┼──────────────────────────────────┐
│                        后端 doc-backend                       │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │           NestJS + WebSocket Gateway                   │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────────┐  │  │
│  │  │ yjs-ws-    │  │ yjs-        │  │ Prisma +       │  │  │
│  │  │ server.ts  │  │ persistence │  │ SQLite         │  │  │
│  │  │ 文档同步   │  │ 增量持久化  │  │ 数据存储       │  │  │
│  │  └────────────┘  └─────────────┘  └────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                      Vercel 部署                              │
└───────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 编辑器核心 | 自定义 mini-quill（Delta 驱动，零依赖 Quill 官方包） |
| 前端框架 | React 19 + Vite 7 + React Router |
| 协同同步 | Yjs CRDT + y-websocket + y-quill |
| 状态管理 | Zustand |
| 测试 | Vitest + happy-dom |
| 部署 | GitHub Pages |

## 目录结构

```
y-Doc/
├── src/
│   ├── core/mini-quill/     # 编辑器核心（10+ 模块）
│   │   ├── __tests__/       # 单元测试（Delta / Blot / Selection）
│   │   ├── mini-quill.ts    # 主类
│   │   ├── delta.ts         # 数据结构
│   │   ├── blot.ts          # DOM 节点工厂
│   │   ├── renderer.ts      # Delta → DOM 渲染
│   │   ├── selection.ts     # 选区管理
│   │   ├── formatter.ts     # 格式操作
│   │   ├── history.ts       # undo/redo
│   │   ├── keyboard.ts      # 键盘处理
│   │   ├── paste.ts         # 粘贴处理
│   │   ├── dom-sync.ts      # DOM 同步
│   │   ├── delta-ops.ts     # Delta 工具函数
│   │   └── README.md        # 核心模块文档
│   ├── core/editor/         # React 编辑器组件（协同接入层）
│   │   ├── MiniQuillEditor.tsx
│   │   └── index.tsx
│   ├── pages/               # 页面
│   │   ├── HomePage.tsx
│   │   └── EditorPage.tsx
│   └── store/               # Zustand 状态管理
│       └── userStore.ts
├── .github/workflows/       # CI/CD → GitHub Pages
└── package.json
```

## 运行方式

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动后端（必须先启动）

后端在独立仓库：[doc-backend](https://github.com/XIAOSHUAI-Y/doc-backend.git)

```bash
git clone https://github.com/XIAOSHUAI-Y/doc-backend.git
cd doc-backend
pnpm install
npx prisma generate
npx prisma migrate dev --name init
pnpm run start:dev
# WebSocket 服务运行在 ws://localhost:3001
```

### 3. 启动前端

```bash
cd y-Doc
pnpm run dev
# 打开 http://localhost:5173/y-Doc
```

### 4. 运行测试

```bash
# 单元测试（76 个用例）
pnpm test:run

# 覆盖率报告
pnpm test:coverage
```

### 5. 构建

```bash
pnpm run build
# 产物在 dist/ 目录，部署到 GitHub Pages
```

## 已实现功能清单

### 编辑器核心

| 功能 | 状态 | 说明 |
|------|------|------|
| Delta 数据结构 | ✅ | insert/delete/retain，链式调用，compress 合并 |
| Blot 系统 | ✅ | TextBlot / InlineBlot / ImageBlot / BlockBlot |
| Renderer | ✅ | Delta → DOM，支持块级/内联格式/代码块高亮 |
| SelectionManager | ✅ | DOM 选区 ↔ Delta 索引双向转换 |
| Formatter | ✅ | 行内格式 + 块级格式，支持 Toggle |
| HistoryManager | ✅ | undo/redo，Delta 快照 |
| KeyboardHandler | ✅ | Enter/Backspace/Tab 特殊处理 + Ctrl+B/I/U/Z/Y |
| PasteHandler | ✅ | 图片粘贴、URL 识别、代码块多行粘贴 |
| DOM 同步 | ✅ | input 事件后 DOM → Delta |
| 代码块 | ✅ | 语法高亮、可折叠、语言选择、复制 |
| 列表 | ✅ | 有序/无序，多级缩进（Tab/Shift+Tab） |
| 引用块 | ✅ | blockquote |

### 多人协同

| 功能 | 状态 | 说明 |
|------|------|------|
| Yjs CRDT 实时同步 | ✅ | y-quill QuillBinding |
| WebSocket 传输 | ✅ | 自定义 y-websocket 服务端 |
| 光标与选区同步 | ✅ | 多用户光标/选区高亮实时显示 |
| 用户离开感知 | ✅ | 断开后光标自动消失 |
| 文档持久化 | ✅ | Yjs update 增量存储 SQLite，重启恢复 |

### 工程化

| 功能 | 状态 | 说明 |
|------|------|------|
| 代码拆分 | ✅ | mini-quill.ts 1485 行 → 6 个模块文件 |
| 单元测试 | ✅ | Delta / Blot / Selection 76 个用例 |
| CI/CD | ✅ | GitHub Actions 自动构建部署 |
| TypeScript | ✅ | 严格模式 |

## 相关仓库

| 仓库 | 地址 | 说明 |
|------|------|------|
| 前端（本仓库） | `XIAOSHUAI-Y/y-Doc` | React + mini-quill + Yjs 客户端 |
| 后端 | [XIAOSHUAI-Y/doc-backend](https://github.com/XIAOSHUAI-Y/doc-backend.git) | NestJS + WebSocket + SQLite 持久化 |

## 文档导航

- [mini-quill 核心模块文档](./src/core/mini-quill/README.md) — API 参考与模块说明
