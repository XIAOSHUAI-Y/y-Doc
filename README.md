# Collab Docs — 多人协同富文本编辑器

基于自定义 mini-quill 编辑器核心 + Yjs CRDT + WebSocket 的在线协作文档系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端编辑器 | 自定义 mini-quill（Delta 驱动，不依赖 Quill 官方包） |
| 前端框架 | React 19 + Vite 7 + React Router |
| 协同同步 | Yjs CRDT + y-websocket + y-quill |
| 后端 | NestJS + WebSocket Gateway |
| 持久化 | SQLite + Prisma ORM（增量 Yjs update 存储） |
| 部署 | GitHub Pages（前端）+ Vercel（后端） |
| 测试 | Vitest + happy-dom |

## 目录结构

```
collab-docs/
├── y-Doc/              # 前端项目
│   ├── src/
│   │   ├── core/mini-quill/    # 编辑器核心（Delta、Blot、Renderer、Selection、Formatter...）
│   │   │   └── __tests__/      # 单元测试
│   │   ├── core/editor/        # React 编辑器组件（协同接入层）
│   │   ├── pages/              # 页面（首页、编辑器页）
│   │   └── store/              # Zustand 状态管理
│   └── .github/workflows/      # 前端 CI/CD
│
├── doc-backend/        # 后端项目
│   ├── src/
│   │   ├── yjs-ws-server.ts    # Yjs WebSocket 服务（文档同步 + 广播）
│   │   ├── yjs-persistence.ts  # Yjs update 持久化到 SQLite
│   │   └── yjs-doc/            # NestJS WebSocket Gateway
│   └── prisma/
│       └── schema.prisma       # YjsDocument / YjsUpdate 模型
│
└── README.md
```

## 运行方式

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd collab-docs
```

### 2. 启动后端

```bash
cd doc-backend

# 安装依赖
pnpm install

# 初始化数据库（生成 Prisma Client + 创建 SQLite 文件）
npx prisma generate
npx prisma migrate dev --name init

# 开发模式启动（热更新）
pnpm run start:dev
# 服务运行在 ws://localhost:3001
```

### 3. 启动前端

```bash
cd ../y-Doc

# 安装依赖
pnpm install

# 开发模式启动
pnpm run dev
# 打开 http://localhost:5173/y-Doc
```

### 4. 运行测试

```bash
cd y-Doc

# watch 模式
pnpm test

# 单次运行
pnpm test:run

# 覆盖率报告
pnpm test:coverage
```

### 5. 构建生产版本

```bash
# 前端
cd y-Doc && pnpm run build
# 产物在 dist/ 目录

# 后端
cd doc-backend && pnpm run build
# 产物在 dist/ 目录
```

## 已实现功能清单

### 编辑器核心（mini-quill）

- [x] **Delta 数据结构** — insert/delete/retain 操作，支持链式调用和 compress 合并
- [x] **Blot 系统** — TextBlot、InlineBlot（bold/italic/color/underline/strike/link）、ImageBlot、BlockBlot（h1-h6/blockquote/code-block）
- [x] **Renderer** — Delta 到 DOM 的渲染，支持块级格式和内联格式
- [x] **SelectionManager** — DOM 选区 ↔ Delta 文本索引的双向转换
- [x] **Formatter** — 对选区应用/取消格式（行内格式 + 块级格式）
- [x] **HistoryManager** — undo/redo，基于 Delta 快照
- [x] **KeyboardHandler** — Enter/Backspace/Tab 在代码块/列表/引用块内的特殊处理，全局快捷键（Ctrl+B/I/U/Z/Y）
- [x] **PasteHandler** — 图片粘贴、URL 自动识别、代码块内多行粘贴
- [x] **DOM 同步** — input 事件后从 DOM 同步回 Delta
- [x] **代码块** — 语法高亮（PrismJS）、可折叠、语言选择、复制按钮
- [x] **列表** — 有序/无序列表，支持多级缩进（Tab/Shift+Tab）
- [x] **引用块** — blockquote 支持

### 多人协同

- [x] **Yjs CRDT 实时同步** — 基于 y-quill 的 QuillBinding
- [x] **WebSocket 传输** — 自定义 y-websocket 服务端
- [x] **光标与选区同步** — 多用户光标位置、选区高亮实时显示
- [x] **用户离开感知** — 断开连接后光标自动消失
- [x] **文档持久化** — 所有 Yjs update 增量存储到 SQLite，服务重启后可恢复

### 工程化

- [x] **代码拆分** — mini-quill.ts 从 1485 行拆分为 6 个功能模块文件
- [x] **单元测试** — Delta、Blot、Selection 核心模块 76 个测试用例
- [x] **CI/CD** — GitHub Actions 自动构建部署
- [x] **TypeScript** — 全项目 TypeScript，严格模式
