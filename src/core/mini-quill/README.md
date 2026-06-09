# mini-quill — 轻量级富文本编辑器核心

mini-quill 是 Collab Docs 的自定义编辑器核心，基于 **Delta 数据结构**驱动，不依赖 Quill 官方包，从零实现了完整的富文本编辑能力。

## 设计原则

1. **Delta 为中心** — 所有编辑操作都转化为 Delta ops，DOM 只是 Delta 的视图
2. **模块化拆分** — 每个职责独立为一个模块，主类只做委托
3. **协同友好** — 接口兼容 y-quill 的 QuillBinding，可无缝接入 Yjs CRDT

## 模块架构

```
mini-quill/
├── mini-quill.ts       # 主类：构造函数、公共 API、事件注册委托
├── delta.ts            # Delta 数据结构：insert / delete / retain / compress
├── blot.ts             # DOM 节点工厂：TextBlot / InlineBlot / ImageBlot / BlockBlot
├── renderer.ts         # Delta → DOM 渲染器
├── selection.ts        # 选区管理器：DOM ↔ Delta 索引双向转换
├── formatter.ts        # 格式操作器：行内格式 + 块级格式 + Toggle
├── history.ts          # 历史管理器：undo / redo
├── keyboard.ts         # 键盘处理器：代码块/列表/引用块特殊按键 + 快捷键
├── paste.ts            # 粘贴处理器：图片 / URL / 代码块多行粘贴
├── dom-sync.ts         # DOM → Delta 同步（input 事件回调）
├── delta-ops.ts        # Delta 纯工具函数：getLineRange / deleteRange / setIndent 等
├── utils.ts            # getOpLength 等通用工具
├── QuillShim.ts        # Quill 兼容层（供 y-quill QuillBinding 使用）
├── RemoteCursorManager.ts  # 多用户远程光标/选区渲染
└── registry.ts         # Blot 注册表
```

## API 文档

### Delta

编辑器的数据结构，一组 `ops` 描述文本操作。

```typescript
class Delta {
  ops: Op[]                    // 操作数组

  constructor(ops?: Op[])

  insert(text: string, attrs?: InlineAttributes | null): this
  delete(length: number): this
  retain(length: number, attrs?: InlineAttributes | null): this
  compress(): this             // 合并相邻同属性 insert
  toJSON(): DeltaJSON
  static fromJSON(json: DeltaJSON): Delta
}
```

**Op 类型：**

| 类型 | 结构 | 示例 |
|------|------|------|
| insert | `{ insert: string \| object, attributes?: object }` | `{ insert: "Hello", attributes: { bold: true } }` |
| delete | `{ delete: number }` | `{ delete: 5 }` |
| retain | `{ retain: number, attributes?: object }` | `{ retain: 3, attributes: { italic: true } }` |

### Blot（DOM 节点工厂）

| 类 | 职责 | 签名 |
|----|------|------|
| `TextBlot` | 纯文本节点 | `static create(text: string): Node` |
| `InlineBlot` | 带内联格式的文本 | `static create(text: string, attrs?: InlineAttributes): HTMLElement` |
| `ImageBlot` | 图片 embed | `static create(url: string): HTMLImageElement` |
| `BlockBlot` | 块级元素 | `static create(format?: BlockFormat): HTMLElement` |

**InlineBlot 支持的属性：** `bold`、`italic`、`color`、`underline`、`strike`、`link`

**BlockBlot 支持的格式：** `header: 1-6`、`blockquote`、`code-block`

### Renderer

Delta 到 DOM 的渲染器。

```typescript
class Renderer {
  constructor(container: HTMLElement)

  render(delta: Delta): void           // 完整渲染 + 代码块高亮
  deltaToBlocks(delta: Delta): BlockData[]
  generateDOMNodes(blocks: BlockData[]): Node[]
  fillBlock(el: HTMLElement, nodes: BlockNode[]): void
  highlightCodeBlock(container: HTMLElement): void
}
```

### SelectionManager

DOM 选区与 Delta 文本索引的双向转换。

```typescript
class SelectionManager {
  constructor(container: HTMLElement)

  // 属性
  index: number        // 选区起始字符索引
  length: number       // 选区长度

  // 方法
  syncFromDOM(): void                          // 从 DOM 同步选区到内部状态
  getIndexFromNode(node: Node, offset: number): number
  setSelection(index: number, length?: number): void   // 从索引设置 DOM 选区
  getRange(): { index: number; length: number }
  save(): void
  restore(): void
}
```

### Formatter

对 Delta 应用格式操作，支持 **Toggle**（再次应用相同格式则取消）。

```typescript
class Formatter {
  constructor(delta: Delta)

  // 行内格式（bold/italic/color/underline/strike/link）
  format(index: number, length: number, attributes: InlineAttributes): void

  // 块级格式（header/list/blockquote/code-block/indent）
  formatBlock(index: number, length: number, blockFormat: BlockFormat): void
}
```

### HistoryManager

```typescript
class HistoryManager {
  constructor(editor: MiniQuill)

  record(): void       // 记录当前 Delta 到历史栈
  undo(): void         // 撤销
  redo(): void         // 重做
}
```

### MiniQuill（主类）

```typescript
class MiniQuill {
  constructor(container: HTMLElement)

  // 格式化
  format(name: string, value: any): void

  // 插入
  insertText(index: number, text: string): void
  insertEmbed(index: number, type: string, value: any): void

  // 删除
  deleteCodeBlock(): void

  // 历史
  undo(): void
  redo(): void

  // 渲染与事件
  render(): void
  emit(event: string): void
}
```

### Delta 工具函数（delta-ops.ts）

```typescript
// 行操作
getLineRange(delta: Delta, index: number): { index: number; length: number }
getLineFormat(delta: Delta, index: number): object

// 代码块操作
getCodeBlockRange(delta: Delta, index: number): { index: number; length: number } | null
lineHasCodeBlock(delta: Delta, index: number): boolean
getCodeBlockLangAt(delta: Delta, index: number): string | null

// 修改操作
setIndent(delta: Delta, index: number, length: number, indent: number): Delta
removeIndent(delta: Delta, index: number, length: number): Delta
deleteRange(delta: Delta, index: number, length: number): Delta

// 格式转换
convertQuillCodeBlockOps(ops: Op[]): Op[]
```

## 事件

MiniQuill 通过 CustomEvent 在容器元素上触发以下事件：

| 事件 | 触发时机 |
|------|----------|
| `text-change` | 内容发生变化（输入、格式化、粘贴等） |
| `copy-toast` | 代码块复制成功 |

## 单元测试

```bash
cd y-Doc
pnpm test:run
```

| 模块 | 测试文件 | 用例数 | 覆盖点 |
|------|----------|--------|--------|
| Delta | `__tests__/delta.test.ts` | 18 | constructor、insert/delete/retain、链式调用、compress、toJSON/fromJSON |
| Blot | `__tests__/blot.test.ts` | 25 | TextBlot、InlineBlot（所有属性组合）、ImageBlot、BlockBlot（所有格式） |
| Selection | `__tests__/selection.test.ts` | 33 | syncFromDOM、getIndexFromNode、setSelection、save/restore、辅助方法 |
