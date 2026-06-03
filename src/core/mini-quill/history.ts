// @ts-nocheck
import { Delta } from './delta'

/**
 * HistoryManager - 操作历史管理
 *
 * 维护 undo/redo 栈，支持撤销和重做操作。
 */
export class HistoryManager {
  private editor: any
  history: any[]
  redoStack: any[]
  maxHistory: number

  constructor(editor: any) {
    this.editor = editor
    this.history = []
    this.redoStack = []
    this.maxHistory = 100
  }

  /** 记录当前 Delta 到历史栈 */
  record() {
    this.history.push(JSON.parse(JSON.stringify(this.editor.delta.ops)))
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
    this.redoStack = []
  }

  /** 撤销 */
  undo() {
    if (this.history.length <= 1) return
    const current = this.history.pop()
    this.redoStack.push(current)
    const previous = this.history[this.history.length - 1]
    this.editor.delta = new Delta(JSON.parse(JSON.stringify(previous)))
    this.editor.render()
    this.editor.emit('text-change')
  }

  /** 重做 */
  redo() {
    if (this.redoStack.length === 0) return
    const next = this.redoStack.pop()
    this.history.push(JSON.parse(JSON.stringify(next)))
    this.editor.delta = new Delta(JSON.parse(JSON.stringify(next)))
    this.editor.render()
    this.editor.emit('text-change')
  }
}
