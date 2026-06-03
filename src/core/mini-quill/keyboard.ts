// @ts-nocheck
import { Delta } from './delta'
import { Formatter } from './formatter'
import { getOpLength } from './utils'
import { getLineRange, lineHasCodeBlock, setIndent, removeIndent, getLineFormat, deleteRange } from './delta-ops'

/**
 * KeyboardHandler - 键盘事件处理
 *
 * 处理所有 keydown 事件：
 * - 代码块/列表/引用块内的 Enter、Backspace、Delete、Tab
 * - 全局格式化快捷键（Ctrl+B/I/U/Z/Y）
 */
export class KeyboardHandler {
  private editor: any

  constructor(editor: any) {
    this.editor = editor
  }

  handle(e: KeyboardEvent) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (this._handleCodeBlockDelete(e)) return
    }
    if (e.key === 'Backspace') {
      if (this._handleListBackspace(e)) return
      if (this._handleBlockquoteBackspace(e)) return
    }
    if (e.key === 'Enter') {
      if (this._handleCodeBlockEnter(e)) return
      if (this._handleListEnter(e)) return
      if (this._handleBlockquoteEnter(e)) return
    }
    if (e.key === 'Tab') {
      if (this._handleListTab(e)) return
    }
    if (e.ctrlKey || e.metaKey) {
      this._handleShortcuts(e)
    }
  }

  /** 代码块内空行 Backspace / Delete 删除当前行 */
  private _handleCodeBlockDelete(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    const range = selection.getRangeAt(0)
    let node = range.startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    const codeBlockContainer = node.closest('.code-block-container')
    if (!codeBlockContainer) return false

    const codeBlock = node.closest('.code-block')
    const isEmptyLine = codeBlock && codeBlock.textContent === ''
    const isEmptyBlock = codeBlockContainer.textContent === ''
    if (!isEmptyLine && !isEmptyBlock) return false

    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)
    ed.historyManager.record()
    ed.delta = deleteRange(ed.delta, lineRange.index, lineRange.length)
    ed.selection.index = Math.max(0, lineRange.index - lineRange.length)
    ed.selection.length = 0
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 列表内 Backspace：光标在空列表项开头时取消列表 */
  private _handleListBackspace(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node.closest('li')) return false

    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)
    if (selRange.index !== lineRange.index || lineRange.length !== 1) return false

    e.preventDefault()
    ed.historyManager.record()
    const formatter = new Formatter(ed.delta)
    formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
    ed.delta = formatter.delta
    ed.delta = removeIndent(ed.delta, lineRange.index, lineRange.length)
    ed.selection.index = lineRange.index
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 引用块内 Backspace：光标在空引用行开头时取消引用 */
  private _handleBlockquoteBackspace(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node.closest('blockquote')) return false

    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)
    if (selRange.index !== lineRange.index || lineRange.length !== 1) return false

    e.preventDefault()
    ed.historyManager.record()
    const formatter = new Formatter(ed.delta)
    formatter.formatBlock(lineRange.index, lineRange.length, { blockquote: null })
    ed.delta = formatter.delta
    ed.selection.index = lineRange.index
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 代码块内 Enter 处理 */
  private _handleCodeBlockEnter(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    const codeBlockContainer = node.closest('.code-block-container')
    if (!codeBlockContainer) return false

    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lang = codeBlockContainer.dataset.lang || 'plaintext'

    let lineRange = getLineRange(ed.delta, selRange.index)
    if (lineRange.length === 0 && selRange.index > 0) {
      lineRange = getLineRange(ed.delta, selRange.index - 1)
    }

    // 当前行为空 code-block 行，且前一行也是空 code-block 行 → 退出代码块
    if (lineRange.length === 1 && lineHasCodeBlock(ed.delta, lineRange.index)) {
      if (lineRange.index > 0) {
        const prevLineRange = getLineRange(ed.delta, lineRange.index - 1)
        if (prevLineRange.length === 1 && lineHasCodeBlock(ed.delta, prevLineRange.index)) {
          ed.historyManager.record()
          const formatter = new Formatter(ed.delta)
          formatter.formatBlock(prevLineRange.index, prevLineRange.length, { 'code-block': null })
          ed.delta = formatter.delta
          ed.delta = deleteRange(ed.delta, lineRange.index, lineRange.length)
          ed.selection.index = prevLineRange.index
          ed.selection.length = 0
          ed.historyManager.record()
          ed.render()
          ed.emit('text-change')
          return true
        }
      }
    }

    // 非退出场景：插入带 code-block 属性的换行
    ed.historyManager.record()
    const ops = []
    let currentIndex = 0
    let inserted = false
    for (const op of ed.delta.ops) {
      const opLength = getOpLength(op)
      if (inserted || currentIndex + opLength <= selRange.index) {
        ops.push({ ...op })
      } else if (typeof op.insert === 'string') {
        const splitAt = selRange.index - currentIndex
        if (splitAt > 0) {
          ops.push({
            insert: op.insert.slice(0, splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        ops.push({ insert: '\n', attributes: { 'code-block': lang } })
        if (splitAt < op.insert.length) {
          ops.push({
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        inserted = true
      } else {
        ops.push({ ...op })
        if (currentIndex === selRange.index) {
          ops.push({ insert: '\n', attributes: { 'code-block': lang } })
          inserted = true
        }
      }
      currentIndex += opLength
    }
    if (!inserted) {
      ops.push({ insert: '\n', attributes: { 'code-block': lang } })
    }
    ed.delta = new Delta(ops)
    ed.selection.index = selRange.index + 1
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 列表内 Enter 处理 */
  private _handleListEnter(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node.closest('li')) return false

    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)

    // 空列表项 → 退出列表
    if (lineRange.length === 1) {
      ed.historyManager.record()
      const formatter = new Formatter(ed.delta)
      formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
      ed.delta = formatter.delta
      ed.delta = removeIndent(ed.delta, lineRange.index, lineRange.length)
      ed.selection.index = lineRange.index
      ed.selection.length = 0
      ed.historyManager.record()
      ed.render()
      ed.emit('text-change')
      return true
    }

    // 非空列表项 → 分裂当前行
    ed.historyManager.record()
    const lineFormat = getLineFormat(ed.delta, selRange.index)
    const ops = []
    let currentIndex = 0
    let inserted = false
    for (const op of ed.delta.ops) {
      const opLength = getOpLength(op)
      if (inserted || currentIndex + opLength <= selRange.index) {
        ops.push({ ...op })
      } else if (typeof op.insert === 'string') {
        const splitAt = selRange.index - currentIndex
        if (splitAt > 0) {
          ops.push({
            insert: op.insert.slice(0, splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        const newLineAttrs: any = {}
        if (lineFormat.list) newLineAttrs.list = lineFormat.list
        if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
        ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
        if (splitAt < op.insert.length) {
          ops.push({
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        inserted = true
      } else {
        ops.push({ ...op })
        if (currentIndex === selRange.index) {
          const newLineAttrs: any = {}
          if (lineFormat.list) newLineAttrs.list = lineFormat.list
          if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
          ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
          inserted = true
        }
      }
      currentIndex += opLength
    }
    if (!inserted) {
      const newLineAttrs: any = {}
      if (lineFormat.list) newLineAttrs.list = lineFormat.list
      if (lineFormat.indent) newLineAttrs.indent = lineFormat.indent
      ops.push({ insert: '\n', ...(Object.keys(newLineAttrs).length > 0 ? { attributes: newLineAttrs } : {}) })
    }
    ed.delta = new Delta(ops)
    ed.selection.index = selRange.index + 1
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 引用块内 Enter 处理 */
  private _handleBlockquoteEnter(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node.closest('blockquote')) return false

    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)

    if (lineRange.length === 1) {
      ed.historyManager.record()
      const formatter = new Formatter(ed.delta)
      formatter.formatBlock(lineRange.index, lineRange.length, { blockquote: null })
      ed.delta = formatter.delta
      ed.selection.index = lineRange.index
      ed.selection.length = 0
      ed.historyManager.record()
      ed.render()
      ed.emit('text-change')
      return true
    }

    ed.historyManager.record()
    const ops = []
    let currentIndex = 0
    let inserted = false
    for (const op of ed.delta.ops) {
      const opLength = getOpLength(op)
      if (inserted || currentIndex + opLength <= selRange.index) {
        ops.push({ ...op })
      } else if (typeof op.insert === 'string') {
        const splitAt = selRange.index - currentIndex
        if (splitAt > 0) {
          ops.push({
            insert: op.insert.slice(0, splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        ops.push({ insert: '\n', attributes: { blockquote: true } })
        if (splitAt < op.insert.length) {
          ops.push({
            insert: op.insert.slice(splitAt),
            ...(op.attributes ? { attributes: { ...op.attributes } } : {})
          })
        }
        inserted = true
      } else {
        ops.push({ ...op })
        if (currentIndex === selRange.index) {
          ops.push({ insert: '\n', attributes: { blockquote: true } })
          inserted = true
        }
      }
      currentIndex += opLength
    }
    if (!inserted) {
      ops.push({ insert: '\n', attributes: { blockquote: true } })
    }
    ed.delta = new Delta(ops)
    ed.selection.index = selRange.index + 1
    ed.selection.length = 0
    ed.historyManager.record()
    ed.render()
    ed.emit('text-change')
    return true
  }

  /** 列表内 Tab 处理 */
  private _handleListTab(e: KeyboardEvent): boolean {
    const selection = window.getSelection()
    if (selection.rangeCount === 0) return false
    let node = selection.getRangeAt(0).startContainer
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
    if (!node.closest('li')) return false

    e.preventDefault()
    const ed = this.editor
    ed.selection.syncFromDOM()
    const selRange = ed.selection.getRange()
    const lineRange = getLineRange(ed.delta, selRange.index)
    const lineFormat = getLineFormat(ed.delta, selRange.index)

    if (e.shiftKey) {
      if (lineFormat.indent && lineFormat.indent > 0) {
        ed.historyManager.record()
        ed.delta = setIndent(ed.delta, lineRange.index, lineRange.length, lineFormat.indent - 1)
        ed.historyManager.record()
        ed.render()
        ed.emit('text-change')
      } else if (lineFormat.list) {
        ed.historyManager.record()
        const formatter = new Formatter(ed.delta)
        formatter.formatBlock(lineRange.index, lineRange.length, { list: null })
        ed.delta = formatter.delta
        ed.delta = removeIndent(ed.delta, lineRange.index, lineRange.length)
        ed.selection.index = selRange.index
        ed.selection.length = 0
        ed.historyManager.record()
        ed.render()
        ed.emit('text-change')
      }
    } else {
      const newIndent = Math.min((lineFormat.indent || 0) + 1, 8)
      ed.historyManager.record()
      ed.delta = setIndent(ed.delta, lineRange.index, lineRange.length, newIndent)
      ed.historyManager.record()
      ed.render()
      ed.emit('text-change')
    }
    return true
  }

  /** 全局快捷键 */
  private _handleShortcuts(e: KeyboardEvent) {
    if (e.key === 'z') {
      e.preventDefault()
      e.shiftKey ? this.editor.historyManager.redo() : this.editor.historyManager.undo()
      return
    }
    if (e.key === 'y') {
      e.preventDefault()
      this.editor.historyManager.redo()
      return
    }
    switch (e.key) {
      case 'b':
        e.preventDefault()
        this.editor.format('bold', true)
        break
      case 'i':
        e.preventDefault()
        this.editor.format('italic', true)
        break
      case 'u':
        e.preventDefault()
        this.editor.format('underline', true)
        break
    }
  }
}
