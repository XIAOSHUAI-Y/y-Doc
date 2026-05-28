# 将 Lexical 替换为 mini-quill

## Context

当前项目使用 Lexical 作为富文本编辑器，存在 reconciler 层面的格式标签优先级问题（B+I 时只生成 `<strong>` 无 `<em>`）。用户决定将其替换为自己编写的 mini-quill（`/Users/yjy/yang/learn/mini-quill/`），一个基于 Delta + Blot 架构的轻量级编辑器。

## 约束与决策

1. **协同编辑暂时保留后端，前端断开**：mini-quill 没有内置 Yjs 绑定。先移除前端 `CollaborationPlugin`，后端 NestJS + Yjs 服务保持不动，后续可自建 Delta→Yjs 桥接。
2. **不支持的功能先隐藏**：表格、文本对齐、代码块主题切换等按钮从工具栏移除，待后续扩展 mini-quill 后再加回。
3. **mini-quill 使用内联样式输出格式**（`style="font-weight:bold"`），不依赖 CSS class，因此原有 `.editor-bold`/`.editor-italic` 类将失效，需重写编辑器内容区样式。

## 推荐方案

### 第一阶段：迁移 mini-quill 源码

**目标**：把 mini-quill 源码作为项目内部模块引入。

**文件**：新建 `y-Doc/src/core/mini-quill/`

复制以下文件（来自 `/Users/yjy/yang/learn/mini-quill/src/`）：
- `delta.js` → `delta.ts`（加简单类型导出）
- `registry.js` → `registry.ts`
- `blot.js` → `blot.ts`
- `renderer.js` → `renderer.ts`
- `selection.js` → `selection.ts`
- `formatter.js` → `formatter.ts`
- `mini-quill.js` → `mini-quill.ts`

并在该目录下创建 `index.ts` 统一导出 `MiniQuill`、`Delta`、`Formatter`。

> 由于 y-Doc 是 TypeScript 项目，直接保留 `.js` 会导致导入时无类型。最简单的方式是复制后改后缀为 `.ts`，补全 `import` 路径（去掉 `.js` 后缀），修正编译错误即可。

### 第二阶段：创建 React 包装组件

**文件**：`y-Doc/src/core/editor/MiniQuillEditor.tsx`

实现一个 React 组件：
- 接收一个 `div` ref 作为容器
- 在 `useEffect` 中 `new MiniQuill(container)`
- 暴露 `editorRef`（`useImperativeHandle`）供 Toolbar 调用 `format()`、`undo()`、`redo()` 等
- 监听 `text-change` 事件，将 `editor.delta` 同步到外部
- `useEffect` cleanup 时清空容器 innerHTML

### 第三阶段：重写 Editor 入口

**文件**：`y-Doc/src/core/editor/index.tsx`

- 移除 `LexicalComposer`、所有 Lexical Plugin、`useLexicalComposerContext`
- 改为渲染 `MiniQuillEditor` + `Toolbar`
- 保留 `editor-sheet`、`editor-wrap` 等布局结构
- 移除 `providerFactory`、`CollaborationPlugin`、`MyOnChangePlugin`
- 保留 `onChange` prop，由 `MiniQuillEditor` 的 `text-change` 驱动

### 第四阶段：重写工具栏

**文件**：`y-Doc/src/pages/components/editorToolbar/index.tsx`

- 移除 `useLexicalComposerContext`
- Toolbar 通过 `editorRef` 调用 mini-quill API：
  - `editorRef.current.format('bold', true)`
  - `editorRef.current.format('italic', true)`
  - `editorRef.current.format('header', level)`
  - `editorRef.current.format('list', 'bullet')`
  - `editorRef.current.format('code-block', true)`
- **隐藏以下按钮**：表格插入、文本对齐、代码块语言/主题下拉
- 状态同步：监听 `text-change`，从 `editorRef.current.delta` 解析当前选区格式，更新按钮激活状态

**文件**：`y-Doc/src/pages/components/editorToolbar/hooks.ts`
- 重写 `useSelectionSync`：改为监听 mini-quill 事件，读取 `selection.getRange()` 和 `delta` 中的 attributes，计算当前激活格式

### 第五阶段：样式适配

**文件**：`y-Doc/src/core/editor/editor.css`

mini-quill 的 `InlineBlot` 使用 `<span style="font-weight:bold; font-style:italic; ...">`，不是 CSS class。因此：
- 删除 `.editor-bold`、`.editor-italic`、`.editor-underline`、`.editor-strikethrough` 的 `color` 规则（内联样式已自带视觉效果）
- 保留块级元素样式：`.editor-sheet h1/h2/h3`、`.editor-code`、列表样式等（mini-quill 的 renderer 对 block 使用标准 HTML 标签 `<h1>`、`<ul>`、`<li>`、`<blockquote>`、`<pre>`）
- 调整 `.editor-input` 或容器样式以匹配 mini-quill 的 `<div>` 输出结构

### 第六阶段：清理依赖与死代码

**文件**：`y-Doc/package.json`
- 移除所有 `lexical`、`@lexical/*`、`yjs`、`y-websocket` 依赖
- 运行 `pnpm install`

**删除以下文件/目录**：
- `src/core/editor/nodes/`（整个目录）
- `src/core/editor/theme/`（整个目录）
- `src/core/editor/collaboration.ts`
- `src/core/editor/node.ts`
- `src/pages/components/editorToolbar/handlers.ts`（Toolbar 直接调用 editor API，不再需要中间 handler）
- `src/pages/components/editorToolbar/Plugin/` 中的表格、对齐、代码块语言/主题插件（或整目录重写）

## 关键文件清单

| 优先级 | 文件/目录 |
|--------|-----------|
| P0 | 新建 `src/core/mini-quill/*.ts` |
| P0 | `src/core/editor/MiniQuillEditor.tsx` |
| P0 | `src/core/editor/index.tsx` |
| P0 | `src/pages/components/editorToolbar/index.tsx` |
| P1 | `src/pages/components/editorToolbar/hooks.ts` |
| P1 | `src/core/editor/editor.css` |
| P2 | `package.json` 依赖清理 |
| P2 | 删除 Lexical 相关死代码 |

## 验证步骤

1. `pnpm install` 成功，无 Lexical 包残留
2. `pnpm run build` 通过 TypeScript 编译
3. `pnpm dev` 启动后：
   - 编辑器正常渲染，可输入文字
   - B/I/U/S 按钮可正常 toggle 格式
   - 标题、列表、引用、代码块按钮正常工作
   - 撤销/重做快捷键生效
   - 粘贴纯文本正常
4. 工具栏中**表格、对齐、代码主题**按钮已隐藏
5. 协同编辑相关 UI（远程光标）不再显示（预期行为）
