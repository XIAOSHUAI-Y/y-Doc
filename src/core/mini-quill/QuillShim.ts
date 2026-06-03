// @ts-nocheck
import QuillDelta from 'quill-delta'
import { Delta as MiniDelta } from './delta'
import type { MiniQuill } from './mini-quill'

/**
 * QuillShim - 给 MiniQuill 包一层 Quill 兼容壳
 *
 * y-quill 的 QuillBinding 依赖以下 API：
 * - updateContents(delta, origin): 将外部 delta 变更应用到编辑器
 * - getContents(): 返回当前 delta（Quill 格式 { ops: [...] }）
 * - getSelection(): 返回 { index, length } 或 null
 * - setContents(delta, origin): 全量替换内容
 * - on(event, handler): 监听 editor-change
 * - off(event, handler): 取消监听
 * - getModule(name): 获取模块（光标相关，返回 null）
 */
export class QuillShim {
  miniQuill: MiniQuill
  private _handlers: Map<Function, { wrapped: Function; setPrevOps: (ops: any[]) => void }>

  constructor(miniQuill: MiniQuill) {
    this.miniQuill = miniQuill
    this._handlers = new Map()
  }

  /** 获取模块（暂不实现光标模块） */
  getModule(_name: string) {
    return null
  }

  /** 返回当前 delta（Quill 格式） */
  getContents() {
    return { ops: this.miniQuill.delta.ops }
  }

  /** 返回选区 { index, length } 或 null */
  getSelection() {
    const range = this.miniQuill.selection.getRange()
    if (range.index === undefined && range.length === undefined) {
      return null
    }
    return { index: range.index, length: range.length }
  }

  /** 全量替换内容 */
  setContents(deltaOps: any[], _origin?: any) {
    this.miniQuill.delta = new MiniDelta(deltaOps)
    this.miniQuill.render()
    // 更新所有 editor-change handler 的 prevOps 快照，避免下次 diff 包含本次变更
    this._handlers.forEach(({ setPrevOps }) => {
      setPrevOps(JSON.parse(JSON.stringify(this.miniQuill.delta.ops)))
    })
  }

  /** 增量应用变更（使用 quill-delta 的 compose） */
  updateContents(deltaOps: any[], _origin?: any) {
    const current = new QuillDelta(this.miniQuill.delta.ops)
    const update = new QuillDelta(deltaOps)
    const composed = current.compose(update)
    this.miniQuill.delta = new MiniDelta(composed.ops)
    this.miniQuill.render()
    // 更新所有 editor-change handler 的 prevOps 快照，避免下次 diff 包含本次远端变更
    this._handlers.forEach(({ setPrevOps }) => {
      setPrevOps(JSON.parse(JSON.stringify(this.miniQuill.delta.ops)))
    })
  }

  /** 代理 mini-quill 的 text-change 事件为 editor-change 格式 */
  on(event: string, handler: Function) {
    if (event !== 'editor-change') {
      // 其他事件直接透传
      this.miniQuill.container.addEventListener(event, handler as EventListener)
      return
    }

    // 保存 delta 快照用于计算 diff
    let prevOps = JSON.parse(JSON.stringify(this.miniQuill.delta.ops))

    const wrappedHandler = () => {
      const currentOps = JSON.parse(JSON.stringify(this.miniQuill.delta.ops))
      const diff = new QuillDelta(prevOps).diff(new QuillDelta(currentOps))
      prevOps = currentOps

      // y-quill 的 _quillObserver 期望 (eventType, delta, state, origin)
      // delta 为 { ops: [...] } 格式，无变更时传 null
      const delta = diff.ops.length > 0 ? { ops: diff.ops } : null
      handler('text-change', delta, null, null)
    }

    this._handlers.set(handler, {
      wrapped: wrappedHandler,
      setPrevOps: (ops: any[]) => { prevOps = ops },
    })
    this.miniQuill.container.addEventListener('text-change', wrappedHandler)

    // 立即触发一次，让 y-quill 初始化 _negatedUsedFormats
    // 这是 y-quill 内部逻辑，确保格式追踪正确初始化
    handler('text-change', { ops: [] }, null, null)
  }

  /** 移除监听 */
  off(event: string, handler: Function) {
    if (event !== 'editor-change') {
      this.miniQuill.container.removeEventListener(event, handler as EventListener)
      return
    }

    const record = this._handlers.get(handler)
    if (record) {
      this.miniQuill.container.removeEventListener('text-change', record.wrapped)
      this._handlers.delete(handler)
    }
  }
}
