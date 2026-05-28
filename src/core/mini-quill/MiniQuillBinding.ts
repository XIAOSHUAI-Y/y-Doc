import * as Y from 'yjs'
import Delta from 'quill-delta'
import { Delta as MiniDelta } from './delta'
import type { MiniQuill } from './mini-quill'

/**
 * Yjs <-> MiniQuill 协同绑定
 *
 * 参考 y-quill 的实现，但直接针对 mini-quill 的 API 设计。
 *
 * 核心机制：
 * 1. 本地变更（input/format/paste）→ mini-quill 发 text-change →
 *    我们 diff 前后 delta → applyDelta 到 Y.Text
 * 2. 远端变更 → Y.Text observe → 全量 toDelta → 写给 mini-quill → render()
 */
export class MiniQuillBinding {
  private prevOps: any[]
  private isProcessing = false
  private ytext: Y.Text
  private editor: MiniQuill

  constructor(ytext: Y.Text, editor: MiniQuill) {
    this.ytext = ytext
    this.editor = editor
    this.prevOps = JSON.parse(JSON.stringify(editor.delta.ops))

    editor.container.addEventListener('text-change', this.onLocalChange)
    ytext.observe(this.onRemoteChange)
  }

  private onLocalChange = () => {
    if (this.isProcessing) return
    this.isProcessing = true

    const currentOps = JSON.parse(JSON.stringify(this.editor.delta.ops))
    const diff = new Delta(this.prevOps).diff(new Delta(currentOps))

    if (diff.ops.length > 0) {
      const doc = this.ytext.doc
      if (doc) {
        doc.transact(() => {
          this.ytext.applyDelta(diff.ops as any)
        }, this)
      }
    }

    this.prevOps = currentOps
    this.isProcessing = false
  }

  private onRemoteChange = (_event: Y.YTextEvent, tr: Y.Transaction) => {
    if (tr.origin === this) return
    if (this.isProcessing) return
    this.isProcessing = true

    // 从 Y.Text 取全量 delta，同步给 mini-quill
    const yjsDelta = this.ytext.toDelta()
    this.editor.delta = new MiniDelta(yjsDelta as any)
    this.editor.render()

    this.prevOps = JSON.parse(JSON.stringify(this.editor.delta.ops))
    this.isProcessing = false
  }

  destroy() {
    this.editor.container.removeEventListener('text-change', this.onLocalChange)
    this.ytext.unobserve(this.onRemoteChange)
  }
}
